import axios from 'axios';

const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY;
const TOGETHER_BASE_URL = process.env.TOGETHER_BASE_URL || 'https://api.together.xyz';
const EMBED_MODEL = process.env.TOGETHER_MODEL_EMBED || 'BAAI/bge-large-en-v1.5';

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await axios.post(
      `${TOGETHER_BASE_URL}/v1/embeddings`,
      {
        model: EMBED_MODEL,
        input: text,
      },
      {
        headers: {
          Authorization: `Bearer ${TOGETHER_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.data[0].embedding;
  } catch (error: any) {
    console.error('Embedding generation error:', error.response?.data || error.message);
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    const response = await axios.post(
      `${TOGETHER_BASE_URL}/v1/embeddings`,
      {
        model: EMBED_MODEL,
        input: texts,
      },
      {
        headers: {
          Authorization: `Bearer ${TOGETHER_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.data.map((item: any) => item.embedding);
  } catch (error: any) {
    console.error('Batch embedding generation error:', error.response?.data || error.message);
    throw new Error(`Failed to generate embeddings: ${error.message}`);
  }
}

export function chunkText(text: string, maxChunkSize: number = 500, overlap: number = 50): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];

  for (let i = 0; i < words.length; i += maxChunkSize - overlap) {
    const chunk = words.slice(i, i + maxChunkSize).join(' ');
    if (chunk.trim()) {
      chunks.push(chunk);
    }
  }

  return chunks;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
