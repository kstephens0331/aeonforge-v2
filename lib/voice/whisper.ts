import axios from 'axios';

const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY;
const TOGETHER_BASE_URL = process.env.TOGETHER_BASE_URL || 'https://api.together.xyz';
const WHISPER_MODEL = process.env.TOGETHER_MODEL_ASR || 'openai/whisper-large-v3';

export async function transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string> {
  try {
    const formData = new FormData();
    const blob = new Blob([audioBuffer.buffer as ArrayBuffer], { type: mimeType });
    formData.append('file', blob, 'audio.webm');
    formData.append('model', WHISPER_MODEL);

    const response = await axios.post(
      `${TOGETHER_BASE_URL}/v1/audio/transcriptions`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${TOGETHER_API_KEY}`,
        },
      }
    );

    return response.data.text;
  } catch (error: any) {
    console.error('Whisper transcription error:', error.response?.data || error.message);
    throw new Error(`Failed to transcribe audio: ${error.message}`);
  }
}

export async function transcribeAudioFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return transcribeAudio(buffer, file.type);
}
