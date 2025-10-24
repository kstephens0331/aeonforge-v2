import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { detectTaskType, sendLLMRequest, streamLLMRequest, getConsensusResponse } from '@/lib/llm/router';
import { enrichWithPubMed } from '@/lib/pubmed/client';
import { retrieveRelevantDocuments } from '@/lib/rag/retrieval';
import { LLMRequest } from '@/types';
import { checkContentModeration } from '@/lib/moderation/checker';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      message,
      projectId,
      conversationHistory = [],
      stream = false,
      useMedicalValidation = false
    } = body;

    // Get user data and check limits
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check subscription limits
    const limits = await checkUserLimits(userData);
    if (!limits.canSend) {
      return NextResponse.json({
        error: 'Limit exceeded',
        message: limits.message
      }, { status: 429 });
    }

    // Content moderation check
    const moderationResult = await checkContentModeration(message, user.id);
    if (moderationResult.blocked) {
      return NextResponse.json({
        error: 'Content violation',
        message: moderationResult.reason
      }, { status: 400 });
    }

    // Detect task type
    const taskType = await detectTaskType(message);
    console.log(`Detected task type: ${taskType}`);

    // Retrieve RAG context
    const ragSources = await retrieveRelevantDocuments(
      message,
      projectId,
      user.id,
      5,
      0.7
    );

    // Build context from RAG
    let contextPrompt = '';
    if (ragSources.length > 0) {
      contextPrompt = '\n\nRelevant context from your knowledge base:\n';
      ragSources.forEach((source, idx) => {
        contextPrompt += `\n[${idx + 1}] ${source.title}: ${source.snippet}`;
      });
    }

    // Prepare LLM request
    const llmRequest: LLMRequest = {
      messages: [
        {
          role: 'system',
          content: getSystemPrompt(taskType, contextPrompt),
        },
        ...conversationHistory,
        {
          role: 'user',
          content: message,
        },
      ],
      taskType,
      temperature: taskType === 'coding' ? 0.3 : 0.7,
      maxTokens: 4096,
    };

    // Use consensus for medical queries
    let llmResponse;
    if (useMedicalValidation && taskType === 'medical') {
      llmResponse = await getConsensusResponse(llmRequest, 2);
    } else if (stream) {
      // Handle streaming in a separate response
      return handleStreamingResponse(llmRequest, message, projectId, user.id, ragSources);
    } else {
      llmResponse = await sendLLMRequest(llmRequest);
    }

    // Enrich with PubMed for medical queries
    let finalResponse = llmResponse.content;
    let allSources = [...ragSources];

    if (taskType === 'medical') {
      const { response: enrichedResponse, sources: pubmedSources } = await enrichWithPubMed(
        message,
        llmResponse.content
      );
      finalResponse = enrichedResponse;
      allSources = [...allSources, ...pubmedSources];
    }

    // Save message to database
    const { error: msgError } = await supabase
      .from('messages')
      .insert([
        {
          project_id: projectId,
          role: 'user',
          content: message,
          token_count: Math.ceil(message.length / 4),
        },
        {
          project_id: projectId,
          role: 'assistant',
          content: finalResponse,
          token_count: llmResponse.tokenCount,
          model_used: llmResponse.model,
          metadata: {
            sources: allSources,
            confidence_score: llmResponse.metadata?.confidenceScore,
            validation_method: llmResponse.metadata?.validationMethod,
          },
        },
      ]);

    if (msgError) {
      console.error('Error saving messages:', msgError);
    }

    // Track token usage
    await supabase.from('token_usage').insert({
      user_id: user.id,
      project_id: projectId,
      tokens_used: llmResponse.tokenCount,
      model_used: llmResponse.model,
      provider: llmResponse.provider,
    });

    // Update user token counts
    await supabase
      .from('users')
      .update({
        tokens_used_this_week: userData.tokens_used_this_week + llmResponse.tokenCount,
        tokens_used_this_month: userData.tokens_used_this_month + llmResponse.tokenCount,
      })
      .eq('id', user.id);

    return NextResponse.json({
      response: finalResponse,
      model: llmResponse.model,
      provider: llmResponse.provider,
      sources: allSources,
      tokenCount: llmResponse.tokenCount,
      metadata: llmResponse.metadata,
    });

  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

function getSystemPrompt(taskType: string, ragContext: string): string {
  const basePrompt = `You are AeonForge, an advanced AI assistant with expertise in all domains. You are highly proficient in coding across all programming languages, medical knowledge, and general problem-solving.

Key Guidelines:
- Be extremely helpful and thorough in your responses
- For medical questions, always emphasize that you are not a doctor and recommend consulting healthcare professionals
- For coding tasks, provide clean, well-documented, production-ready code
- Cite sources when making factual claims
- If you're uncertain about something, acknowledge it
- Maintain ethical boundaries and refuse illegal requests

${ragContext}`;

  if (taskType === 'medical') {
    return basePrompt + `\n\nFor this medical query, ensure all factual claims are backed by scientific evidence. If PubMed sources are provided, reference them. Always include appropriate medical disclaimers.`;
  }

  if (taskType === 'coding') {
    return basePrompt + `\n\nFor this coding task, provide production-quality code with best practices, error handling, and clear documentation.`;
  }

  return basePrompt;
}

async function checkUserLimits(userData: any): Promise<{ canSend: boolean; message?: string }> {
  const tier = userData.subscription_tier;

  if (tier === 'free') {
    // Check message count (would need a separate table/counter)
    // Simplified for now
    return { canSend: true };
  }

  if (tier === 'standard') {
    const weeklyLimit = 500000; // tokens per week
    if (userData.tokens_used_this_week >= weeklyLimit) {
      return {
        canSend: false,
        message: 'Weekly token limit reached. Resets next week.'
      };
    }
  }

  // Pro and enterprise have unlimited or high limits
  return { canSend: true };
}

async function handleStreamingResponse(
  llmRequest: LLMRequest,
  userMessage: string,
  projectId: string,
  userId: string,
  ragSources: any[]
) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const llmResponse = await streamLLMRequest(llmRequest, (chunk) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
        });

        // Send final metadata
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              done: true,
              model: llmResponse.model,
              provider: llmResponse.provider,
              tokenCount: llmResponse.tokenCount,
              sources: ragSources,
            })}\n\n`
          )
        );

        controller.close();
      } catch (error: any) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: error.message })}\n\n`)
        );
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
