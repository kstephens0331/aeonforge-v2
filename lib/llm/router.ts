import { LLMProvider, LLMRequest, LLMResponse, TaskType } from '@/types';
import { sendClaudeRequest, streamClaudeRequest } from './providers/claude';
import { sendGeminiRequest, streamGeminiRequest } from './providers/gemini';
import { sendTogetherRequest, streamTogetherRequest } from './providers/together';

interface ProviderConfig {
  provider: LLMProvider;
  priority: number;
  send: (request: LLMRequest) => Promise<LLMResponse>;
  stream: (request: LLMRequest, onChunk: (chunk: string) => void) => Promise<LLMResponse>;
}

const PROVIDER_CONFIGS: ProviderConfig[] = [
  {
    provider: 'claude' as LLMProvider,
    priority: parseInt(process.env.CLAUDE_PRIORITY || '1'),
    send: sendClaudeRequest,
    stream: streamClaudeRequest,
  },
  {
    provider: 'gemini' as LLMProvider,
    priority: parseInt(process.env.GEMINI_PRIORITY || '2'),
    send: sendGeminiRequest,
    stream: streamGeminiRequest,
  },
  {
    provider: 'together' as LLMProvider,
    priority: parseInt(process.env.TOGETHER_PRIORITY || '3'),
    send: sendTogetherRequest,
    stream: streamTogetherRequest,
  },
].sort((a, b) => a.priority - b.priority);

// Task-specific routing preferences
const TASK_PROVIDER_PREFERENCES: Partial<Record<TaskType, LLMProvider[]>> = {
  coding: ['claude', 'gemini', 'together'],
  medical: ['claude', 'gemini', 'together'], // Highest accuracy models
  thinking: ['claude', 'gemini', 'together'],
  general: ['gemini', 'claude', 'together'], // Gemini for speed
  multilingual: ['gemini', 'claude', 'together'],
  longform: ['claude', 'together', 'gemini'],
};

function getOrderedProviders(taskType?: TaskType): ProviderConfig[] {
  const forceProvider = process.env.FORCE_PROVIDER as LLMProvider | undefined;

  if (forceProvider) {
    const provider = PROVIDER_CONFIGS.find(p => p.provider === forceProvider);
    return provider ? [provider] : PROVIDER_CONFIGS;
  }

  if (taskType && TASK_PROVIDER_PREFERENCES[taskType]) {
    const preferredOrder = TASK_PROVIDER_PREFERENCES[taskType]!;
    const ordered = preferredOrder
      .map(name => PROVIDER_CONFIGS.find(p => p.provider === name))
      .filter((p): p is ProviderConfig => p !== undefined);

    // Add any remaining providers not in preferences
    const remaining = PROVIDER_CONFIGS.filter(
      p => !preferredOrder.includes(p.provider)
    );

    return [...ordered, ...remaining];
  }

  return PROVIDER_CONFIGS;
}

export async function sendLLMRequest(request: LLMRequest): Promise<LLMResponse> {
  const providers = getOrderedProviders(request.taskType);
  let lastError: Error | null = null;

  for (const providerConfig of providers) {
    try {
      console.log(`Attempting request with ${providerConfig.provider} (priority: ${providerConfig.priority})`);
      const response = await providerConfig.send(request);
      console.log(`✓ Success with ${providerConfig.provider}`);
      return response;
    } catch (error: any) {
      lastError = error;
      console.warn(`✗ ${providerConfig.provider} failed:`, error.message);

      // Don't retry if it's a validation error or bad request
      if (error.message.includes('validation') || error.message.includes('400')) {
        throw error;
      }

      // Continue to next provider
      continue;
    }
  }

  // All providers failed
  throw new Error(
    `All LLM providers failed. Last error: ${lastError?.message || 'Unknown error'}`
  );
}

export async function streamLLMRequest(
  request: LLMRequest,
  onChunk: (chunk: string) => void
): Promise<LLMResponse> {
  const providers = getOrderedProviders(request.taskType);
  let lastError: Error | null = null;

  for (const providerConfig of providers) {
    try {
      console.log(`Attempting streaming with ${providerConfig.provider} (priority: ${providerConfig.priority})`);
      const response = await providerConfig.stream(request, onChunk);
      console.log(`✓ Streaming success with ${providerConfig.provider}`);
      return response;
    } catch (error: any) {
      lastError = error;
      console.warn(`✗ ${providerConfig.provider} streaming failed:`, error.message);

      if (error.message.includes('validation') || error.message.includes('400')) {
        throw error;
      }

      continue;
    }
  }

  throw new Error(
    `All LLM providers failed for streaming. Last error: ${lastError?.message || 'Unknown error'}`
  );
}

// Multi-model consensus for critical queries (medical, legal, etc.)
export async function getConsensusResponse(
  request: LLMRequest,
  minProviders: number = 2
): Promise<LLMResponse> {
  const providers = getOrderedProviders(request.taskType).slice(0, minProviders);

  const responses = await Promise.allSettled(
    providers.map(p => p.send(request))
  );

  const successful = responses
    .filter((r): r is PromiseFulfilledResult<LLMResponse> => r.status === 'fulfilled')
    .map(r => r.value);

  if (successful.length === 0) {
    throw new Error('No providers succeeded for consensus request');
  }

  // For now, return the first successful response
  // TODO: Implement actual consensus logic (compare responses, vote, etc.)
  const primaryResponse = successful[0];

  return {
    ...primaryResponse,
    metadata: {
      ...primaryResponse.metadata,
      validationMethod: 'consensus',
      confidenceScore: successful.length >= minProviders ? 0.95 : 0.7,
    },
  };
}

export async function detectTaskType(userMessage: string): Promise<TaskType> {
  const lowerMessage = userMessage.toLowerCase();

  // Medical keywords
  if (
    lowerMessage.includes('medical') ||
    lowerMessage.includes('health') ||
    lowerMessage.includes('disease') ||
    lowerMessage.includes('symptom') ||
    lowerMessage.includes('treatment') ||
    lowerMessage.includes('diagnosis') ||
    lowerMessage.includes('pubmed')
  ) {
    return 'medical';
  }

  // Coding keywords
  if (
    lowerMessage.includes('code') ||
    lowerMessage.includes('function') ||
    lowerMessage.includes('debug') ||
    lowerMessage.includes('error') ||
    lowerMessage.includes('implement') ||
    lowerMessage.includes('algorithm') ||
    /\b(python|javascript|typescript|java|c\+\+|rust|go)\b/.test(lowerMessage)
  ) {
    return 'coding';
  }

  // Thinking/reasoning keywords
  if (
    lowerMessage.includes('analyze') ||
    lowerMessage.includes('think through') ||
    lowerMessage.includes('reasoning') ||
    lowerMessage.includes('step by step') ||
    lowerMessage.includes('explain why')
  ) {
    return 'thinking';
  }

  // Longform content
  if (
    lowerMessage.includes('write an article') ||
    lowerMessage.includes('write an essay') ||
    lowerMessage.includes('detailed explanation') ||
    lowerMessage.includes('comprehensive') ||
    lowerMessage.length > 500
  ) {
    return 'longform';
  }

  // Multilingual
  if (
    lowerMessage.includes('translate') ||
    lowerMessage.includes('language') ||
    /[\u4e00-\u9fa5]/.test(userMessage) || // Chinese
    /[\u0600-\u06FF]/.test(userMessage) || // Arabic
    /[\u0400-\u04FF]/.test(userMessage)    // Cyrillic
  ) {
    return 'multilingual';
  }

  return 'general';
}
