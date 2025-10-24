import Anthropic from '@anthropic-ai/sdk';
import { LLMRequest, LLMResponse, TaskType } from '@/types';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL_MAP: Record<TaskType, string> = {
  general: process.env.CLAUDE_MODEL_GENERAL || 'claude-3-5-sonnet-20241022',
  thinking: process.env.CLAUDE_MODEL_THINKING || 'claude-3-7-sonnet-20250219',
  coding: process.env.CLAUDE_MODEL_CODER || 'claude-3-5-sonnet-20241022',
  longform: process.env.CLAUDE_MODEL_LONGFORM || 'claude-3-7-sonnet-20250219',
  multilingual: process.env.CLAUDE_MODEL_MULTILINGUAL || 'claude-3-5-sonnet-20241022',
  medical: process.env.CLAUDE_MODEL_THINKING || 'claude-3-7-sonnet-20250219',
};

export async function sendClaudeRequest(request: LLMRequest): Promise<LLMResponse> {
  const model = MODEL_MAP[request.taskType || 'general'];

  try {
    const response = await client.messages.create({
      model,
      max_tokens: request.maxTokens || 4096,
      temperature: request.temperature ?? 0.7,
      messages: request.messages.map(msg => ({
        role: msg.role === 'system' ? 'user' : msg.role,
        content: msg.content,
      })),
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : '';

    return {
      content,
      model,
      provider: 'claude',
      tokenCount: response.usage.input_tokens + response.usage.output_tokens,
      finishReason: response.stop_reason || undefined,
    };
  } catch (error: any) {
    console.error('Claude API error:', error);
    throw new Error(`Claude API failed: ${error.message}`);
  }
}

export async function streamClaudeRequest(
  request: LLMRequest,
  onChunk: (chunk: string) => void
): Promise<LLMResponse> {
  const model = MODEL_MAP[request.taskType || 'general'];

  try {
    const stream = await client.messages.create({
      model,
      max_tokens: request.maxTokens || 4096,
      temperature: request.temperature ?? 0.7,
      messages: request.messages.map(msg => ({
        role: msg.role === 'system' ? 'user' : msg.role,
        content: msg.content,
      })),
      stream: true,
    });

    let fullContent = '';
    let inputTokens = 0;
    let outputTokens = 0;

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        const chunk = event.delta.text;
        fullContent += chunk;
        onChunk(chunk);
      } else if (event.type === 'message_start') {
        inputTokens = event.message.usage.input_tokens;
      } else if (event.type === 'message_delta') {
        outputTokens = event.usage.output_tokens;
      }
    }

    return {
      content: fullContent,
      model,
      provider: 'claude',
      tokenCount: inputTokens + outputTokens,
    };
  } catch (error: any) {
    console.error('Claude streaming error:', error);
    throw new Error(`Claude streaming failed: ${error.message}`);
  }
}
