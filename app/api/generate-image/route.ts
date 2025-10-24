import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateImage, buildPromptWithStyle, PRESET_SIZES, STYLE_PRESETS } from '@/lib/image/flux';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user tier (image generation is Pro+ only)
    const { data: userData } = await supabase
      .from('users')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    if (!userData || !['pro', 'team', 'enterprise'].includes(userData.subscription_tier)) {
      return NextResponse.json({
        error: 'Image generation requires Pro plan or higher'
      }, { status: 403 });
    }

    const body = await request.json();
    const {
      prompt,
      size = 'square',
      style,
      steps = 28,
      n = 1,
      seed,
    } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Get dimensions from preset or custom
    const dimensions = PRESET_SIZES[size as keyof typeof PRESET_SIZES] || PRESET_SIZES.square;

    // Build prompt with style
    const finalPrompt = buildPromptWithStyle(prompt, style);

    console.log(`Generating image: "${finalPrompt}"`);

    const images = await generateImage({
      prompt: finalPrompt,
      width: dimensions.width,
      height: dimensions.height,
      steps,
      n,
      seed,
    });

    // Save to user's storage (optional)
    if (images.length > 0) {
      // Track image generation in token usage
      await supabase.from('token_usage').insert({
        user_id: user.id,
        tokens_used: steps * 10, // Rough estimate: 10 tokens per step
        model_used: 'FLUX.1-dev',
        provider: 'together',
      });
    }

    return NextResponse.json({ images });

  } catch (error: any) {
    console.error('Image generation error:', error);
    return NextResponse.json(
      { error: 'Image generation failed', message: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    presets: {
      sizes: Object.keys(PRESET_SIZES),
      styles: Object.keys(STYLE_PRESETS),
    },
  });
}
