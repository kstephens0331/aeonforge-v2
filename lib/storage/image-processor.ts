import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const COMPRESSION_QUALITY = parseInt(process.env.IMAGE_COMPRESSION_QUALITY || '80');
const THUMBNAIL_WIDTH = 300;
const MAX_ORIGINAL_WIDTH = 1920;

interface ImageProcessResult {
  originalUrl: string;
  compressedUrl: string;
  thumbnailUrl: string;
  originalSize: number;
  compressedSize: number;
  thumbnailSize: number;
}

export async function processAndUploadImage(
  imageBuffer: Buffer,
  fileName: string,
  userId: string,
  projectId?: string
): Promise<ImageProcessResult> {
  const timestamp = Date.now();
  const safeName = fileName.replace(/[^a-z0-9.-]/gi, '_').toLowerCase();
  const baseFileName = `${userId}/${timestamp}_${safeName}`;

  // Process images in parallel
  const [original, compressed, thumbnail] = await Promise.all([
    // Original (resized if too large)
    sharp(imageBuffer)
      .resize(MAX_ORIGINAL_WIDTH, null, {
        withoutEnlargement: true,
        fit: 'inside',
      })
      .toFormat('webp', { quality: 95 })
      .toBuffer(),

    // Compressed version
    sharp(imageBuffer)
      .resize(MAX_ORIGINAL_WIDTH, null, {
        withoutEnlargement: true,
        fit: 'inside',
      })
      .toFormat('webp', { quality: COMPRESSION_QUALITY })
      .toBuffer(),

    // Thumbnail
    sharp(imageBuffer)
      .resize(THUMBNAIL_WIDTH, null, {
        withoutEnlargement: true,
        fit: 'inside',
      })
      .toFormat('webp', { quality: 70 })
      .toBuffer(),
  ]);

  // Upload to Supabase Storage in parallel
  const [originalUpload, compressedUpload, thumbnailUpload] = await Promise.all([
    supabase.storage
      .from('user-files')
      .upload(`${baseFileName}_original.webp`, original, {
        contentType: 'image/webp',
        cacheControl: '3600',
      }),

    supabase.storage
      .from('user-files')
      .upload(`${baseFileName}_compressed.webp`, compressed, {
        contentType: 'image/webp',
        cacheControl: '3600',
      }),

    supabase.storage
      .from('user-files')
      .upload(`${baseFileName}_thumb.webp`, thumbnail, {
        contentType: 'image/webp',
        cacheControl: '3600',
      }),
  ]);

  if (originalUpload.error) throw originalUpload.error;
  if (compressedUpload.error) throw compressedUpload.error;
  if (thumbnailUpload.error) throw thumbnailUpload.error;

  // Get public URLs
  const { data: { publicUrl: originalUrl } } = supabase.storage
    .from('user-files')
    .getPublicUrl(`${baseFileName}_original.webp`);

  const { data: { publicUrl: compressedUrl } } = supabase.storage
    .from('user-files')
    .getPublicUrl(`${baseFileName}_compressed.webp`);

  const { data: { publicUrl: thumbnailUrl } } = supabase.storage
    .from('user-files')
    .getPublicUrl(`${baseFileName}_thumb.webp`);

  // Save to database
  await supabase.from('user_storage').insert({
    user_id: userId,
    project_id: projectId || null,
    file_path: `${baseFileName}_original.webp`,
    file_name: fileName,
    file_type: 'image/webp',
    file_size_bytes: original.length,
    compressed_size_bytes: compressed.length,
    storage_url: compressedUrl,
    thumbnail_url: thumbnailUrl,
  });

  return {
    originalUrl,
    compressedUrl,
    thumbnailUrl,
    originalSize: imageBuffer.length,
    compressedSize: compressed.length,
    thumbnailSize: thumbnail.length,
  };
}

export async function deleteImage(fileId: string, userId: string): Promise<void> {
  // Get file info
  const { data: file, error } = await supabase
    .from('user_storage')
    .select('*')
    .eq('id', fileId)
    .eq('user_id', userId)
    .single();

  if (error || !file) {
    throw new Error('File not found or unauthorized');
  }

  // Delete all versions from storage
  const basePath = file.file_path.replace('_original.webp', '');
  await Promise.all([
    supabase.storage.from('user-files').remove([`${basePath}_original.webp`]),
    supabase.storage.from('user-files').remove([`${basePath}_compressed.webp`]),
    supabase.storage.from('user-files').remove([`${basePath}_thumb.webp`]),
  ]);

  // Delete from database
  await supabase
    .from('user_storage')
    .delete()
    .eq('id', fileId)
    .eq('user_id', userId);
}

export async function getUserStorageUsage(userId: string): Promise<{
  totalBytes: number;
  totalFiles: number;
  limitBytes: number;
  percentageUsed: number;
}> {
  const { data: user } = await supabase
    .from('users')
    .select('storage_used_bytes, subscription_tier')
    .eq('id', userId)
    .single();

  if (!user) {
    throw new Error('User not found');
  }

  const { data: files } = await supabase
    .from('user_storage')
    .select('id')
    .eq('user_id', userId);

  const limitMap = {
    free: 107374182, // 0.1 GB
    standard: 1073741824, // 1 GB
    pro: 5368709120, // 5 GB
    team: 10737418240, // 10 GB
    enterprise: 53687091200, // 50 GB
  };

  const limitBytes = limitMap[user.subscription_tier as keyof typeof limitMap];

  return {
    totalBytes: user.storage_used_bytes,
    totalFiles: files?.length || 0,
    limitBytes,
    percentageUsed: (user.storage_used_bytes / limitBytes) * 100,
  };
}

export async function optimizeExistingImage(
  imageUrl: string,
  userId: string
): Promise<ImageProcessResult> {
  // Fetch the image
  const response = await fetch(imageUrl);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const fileName = imageUrl.split('/').pop() || 'image.jpg';

  return processAndUploadImage(buffer, fileName, userId);
}
