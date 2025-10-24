import axios from 'axios';

const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY;
const TOGETHER_BASE_URL = process.env.TOGETHER_BASE_URL || 'https://api.together.xyz';
const TTS_MODEL = process.env.TOGETHER_MODEL_TTS || 'together/cartesia-sonic';

export async function textToSpeech(text: string, voice: string = 'alloy'): Promise<Buffer> {
  try {
    const response = await axios.post(
      `${TOGETHER_BASE_URL}/v1/audio/speech`,
      {
        model: TTS_MODEL,
        input: text,
        voice,
      },
      {
        headers: {
          Authorization: `Bearer ${TOGETHER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        responseType: 'arraybuffer',
      }
    );

    return Buffer.from(response.data);
  } catch (error: any) {
    console.error('TTS error:', error.response?.data || error.message);
    throw new Error(`Failed to generate speech: ${error.message}`);
  }
}

export const AVAILABLE_VOICES = [
  'alloy',
  'echo',
  'fable',
  'onyx',
  'nova',
  'shimmer',
];
