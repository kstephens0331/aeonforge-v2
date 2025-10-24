import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMRequest, LLMResponse, TaskType } from '@/types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const MODEL_MAP: Record<TaskType, string> = {
  general: process.env.GEMINI_MODEL_GENERAL || 'gemini-2.0-flash-exp',
  thinking: process.env.GEMINI_MODEL_THINKING || 'gemini-2.0-flash-thinking-exp-01-21',
  coding: process.env.GEMINI_MODEL_CODER || 'gemini-2.0-flash-exp',
  longform: process.env.GEMINI_MODEL_LONGFORM || 'gemini-1.5-pro-latest',
  multilingual: process.env.GEMINI_MODEL_MULTILINGUAL || 'gemini-2.0-flash-exp',
  medical: process.env.GEMINI_MODEL_THINKING || 'gemini-2.0-flash-thinking-exp-01-21',
};

export async function sendGeminiRequest(request: LLMRequest): Promise<LLMResponse> {
  const modelName = MODEL_MAP[request.taskType || 'general'];
  const model = genAI.getGenerativeModel({ model: modelName });

  try {
    const chat = model.startChat({
      history: request.messages.slice(0, -1).map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      })),
      generationConfig: {
        maxOutputTokens: request.maxTokens || 4096,
        temperature: request.temperature ?? 0.7,
      },
    });

    const lastMessage = request.messages[request.messages.length - 1];
    const result = await chat.sendMessage(lastMessage.content);
    const response = await result.response;
    const content = response.text();

    // Gemini doesn't provide exact token counts in the same way
    // Estimate based on content length
    const estimatedTokens = Math.ceil((content.length + lastMessage.content.length) / 4);

    return {
      content,
      model: modelName,
      provider: 'gemini',
      tokenCount: estimatedTokens,
    };
  } catch (error: any) {
    console.error('Gemini API error:', error);
    throw new Error(`Gemini API failed: ${error.message}`);
  }
}

export async function streamGeminiRequest(
  request: LLMRequest,
  onChunk: (chunk: string) => void
): Promise<LLMResponse> {
  const modelName = MODEL_MAP[request.taskType || 'general'];
  const model = genAI.getGenerativeModel({ model: modelName });

  try {
    const chat = model.startChat({
      history: request.messages.slice(0, -1).map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      })),
      generationConfig: {
        maxOutputTokens: request.maxTokens || 4096,
        temperature: request.temperature ?? 0.7,
      },
    });

    const lastMessage = request.messages[request.messages.length - 1];
    const result = await chat.sendMessageStream(lastMessage.content);

    let fullContent = '';
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      fullContent += chunkText;
      onChunk(chunkText);
    }

    const estimatedTokens = Math.ceil((fullContent.length + lastMessage.content.length) / 4);

    return {
      content: fullContent,
      model: modelName,
      provider: 'gemini',
      tokenCount: estimatedTokens,
    };
  } catch (error: any) {
    console.error('Gemini streaming error:', error);
    throw new Error(`Gemini streaming failed: ${error.message}`);
  }
}
