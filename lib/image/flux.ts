import axios from 'axios';

const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY;
const TOGETHER_BASE_URL = process.env.TOGETHER_BASE_URL || 'https://api.together.xyz';
const IMAGE_MODEL = process.env.TOGETHER_MODEL_IMAGE || 'black-forest-labs/FLUX.1-dev';

export interface ImageGenerationOptions {
  prompt: string;
  width?: number;
  height?: number;
  steps?: number;
  n?: number; // number of images
  seed?: number;
}

export interface GeneratedImage {
  url: string;
  b64_json?: string;
}

export async function generateImage(options: ImageGenerationOptions): Promise<GeneratedImage[]> {
  const {
    prompt,
    width = 1024,
    height = 1024,
    steps = 28,
    n = 1,
    seed,
  } = options;

  try {
    const response = await axios.post(
      `${TOGETHER_BASE_URL}/v1/images/generations`,
      {
        model: IMAGE_MODEL,
        prompt,
        width,
        height,
        steps,
        n,
        seed,
        response_format: 'url',
      },
      {
        headers: {
          Authorization: `Bearer ${TOGETHER_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.data.map((item: any) => ({
      url: item.url,
      b64_json: item.b64_json,
    }));
  } catch (error: any) {
    console.error('Image generation error:', error.response?.data || error.message);
    throw new Error(`Failed to generate image: ${error.message}`);
  }
}

export const PRESET_SIZES = {
  square: { width: 1024, height: 1024 },
  landscape: { width: 1344, height: 768 },
  portrait: { width: 768, height: 1344 },
  wide: { width: 1536, height: 640 },
};

export const STYLE_PRESETS = {
  realistic: 'photorealistic, highly detailed, 8k, sharp focus',
  artistic: 'artistic, painterly, expressive, vibrant colors',
  anime: 'anime style, manga, detailed, vibrant',
  digital: 'digital art, trending on artstation, highly detailed',
  '3d': '3d render, octane render, highly detailed, professional',
  sketch: 'pencil sketch, hand drawn, detailed linework',
};

export function buildPromptWithStyle(
  basePrompt: string,
  style?: keyof typeof STYLE_PRESETS
): string {
  if (!style) return basePrompt;
  return `${basePrompt}, ${STYLE_PRESETS[style]}`;
}
