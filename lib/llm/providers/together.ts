import axios from 'axios';
import { LLMRequest, LLMResponse, TaskType } from '@/types';

const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY;
const TOGETHER_BASE_URL = process.env.TOGETHER_BASE_URL || 'https://api.together.xyz';

const MODEL_MAP: Record<TaskType, string> = {
  general: process.env.TOGETHER_MODEL_GENERAL || 'meta-llama/llama-3.1-70b-instruct-turbo',
  thinking: process.env.TOGETHER_MODEL_THINKING || 'deepseek-ai/DeepSeek-R1-Distill-Llama-70B',
  coding: process.env.TOGETHER_MODEL_CODER || 'qwen/qwen2.5-coder-32b-instruct',
  longform: process.env.TOGETHER_MODEL_LONGFORM || 'qwen/qwen-2.5-72b-instruct',
  multilingual: process.env.TOGETHER_MODEL_MULTILINGUAL || 'qwen/qwen-2.5-72b-instruct',
  medical: process.env.TOGETHER_MODEL_THINKING || 'deepseek-ai/DeepSeek-R1-Distill-Llama-70B',
};

export async function sendTogetherRequest(request: LLMRequest): Promise<LLMResponse> {
  const model = MODEL_MAP[request.taskType || 'general'];

  try {
    const response = await axios.post(
      `${TOGETHER_BASE_URL}/v1/chat/completions`,
      {
        model,
        messages: request.messages,
        max_tokens: request.maxTokens || 4096,
        temperature: request.temperature ?? 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${TOGETHER_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const choice = response.data.choices[0];
    const usage = response.data.usage;

    return {
      content: choice.message.content,
      model,
      provider: 'together',
      tokenCount: usage.total_tokens,
      finishReason: choice.finish_reason,
    };
  } catch (error: any) {
    console.error('Together API error:', error.response?.data || error.message);
    throw new Error(`Together API failed: ${error.response?.data?.error?.message || error.message}`);
  }
}

export async function streamTogetherRequest(
  request: LLMRequest,
  onChunk: (chunk: string) => void
): Promise<LLMResponse> {
  const model = MODEL_MAP[request.taskType || 'general'];

  try {
    const response = await axios.post(
      `${TOGETHER_BASE_URL}/v1/chat/completions`,
      {
        model,
        messages: request.messages,
        max_tokens: request.maxTokens || 4096,
        temperature: request.temperature ?? 0.7,
        stream: true,
      },
      {
        headers: {
          Authorization: `Bearer ${TOGETHER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        responseType: 'stream',
      }
    );

    let fullContent = '';
    let totalTokens = 0;

    return new Promise((resolve, reject) => {
      response.data.on('data', (chunk: Buffer) => {
        const lines = chunk
          .toString()
          .split('\n')
          .filter((line) => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices[0]?.delta?.content;
              if (delta) {
                fullContent += delta;
                onChunk(delta);
              }

              if (parsed.usage) {
                totalTokens = parsed.usage.total_tokens;
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      });

      response.data.on('end', () => {
        resolve({
          content: fullContent,
          model,
          provider: 'together',
          tokenCount: totalTokens || Math.ceil(fullContent.length / 4),
        });
      });

      response.data.on('error', (error: Error) => {
        reject(new Error(`Together streaming failed: ${error.message}`));
      });
    });
  } catch (error: any) {
    console.error('Together streaming error:', error.response?.data || error.message);
    throw new Error(`Together streaming failed: ${error.response?.data?.error?.message || error.message}`);
  }
}
