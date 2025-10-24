import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { textToSpeech } from '@/lib/voice/tts';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { text, voice = 'alloy' } = body;

    if (!text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    // Limit text length (max 4096 chars)
    if (text.length > 4096) {
      return NextResponse.json({ error: 'Text too long (max 4096 characters)' }, { status: 400 });
    }

    const audioBuffer = await textToSpeech(text, voice);

    return new NextResponse(audioBuffer.buffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
      },
    });

  } catch (error: any) {
    console.error('TTS error:', error);
    return NextResponse.json(
      { error: 'TTS failed', message: error.message },
      { status: 500 }
    );
  }
}
