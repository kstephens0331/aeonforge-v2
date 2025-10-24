import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ALERT_EMAIL = process.env.ALERT_EMAIL || 'info@stephenscode.dev';

interface ModerationResult {
  blocked: boolean;
  reason?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  shouldAlert?: boolean;
}

const ILLEGAL_KEYWORDS = [
  'bomb making',
  'illegal drugs',
  'human trafficking',
  'child abuse',
  'terrorism',
  'hack into',
  'steal credit card',
  'counterfeit money',
];

const GRAY_AREA_KEYWORDS = [
  'penetration testing',
  'security audit',
  'vulnerability assessment',
  'exploit development',
  'reverse engineering',
  'darkweb',
  'cryptocurrency scam',
  'tax evasion',
];

export async function checkContentModeration(
  content: string,
  userId: string,
  messageId?: string
): Promise<ModerationResult> {
  const lowerContent = content.toLowerCase();

  // Check for illegal content
  for (const keyword of ILLEGAL_KEYWORDS) {
    if (lowerContent.includes(keyword)) {
      await flagContent(userId, messageId, `Illegal content detected: ${keyword}`, 'critical');
      await sendAlert(userId, content, keyword, 'critical');

      return {
        blocked: true,
        reason: 'This request violates our terms of service and cannot be processed.',
        severity: 'critical',
        shouldAlert: true,
      };
    }
  }

  // Check for gray area content
  for (const keyword of GRAY_AREA_KEYWORDS) {
    if (lowerContent.includes(keyword)) {
      await flagContent(userId, messageId, `Gray area content: ${keyword}`, 'medium');
      await sendAlert(userId, content, keyword, 'medium');

      // Don't block, but alert and flag
      return {
        blocked: false,
        severity: 'medium',
        shouldAlert: true,
      };
    }
  }

  // Use Llama Guard for additional safety checking
  const guardResult = await runLlamaGuard(content);
  if (guardResult.unsafe) {
    await flagContent(userId, messageId, `Llama Guard flagged: ${guardResult.category}`, 'high');

    if (guardResult.category === 'illegal' || guardResult.category === 'violence') {
      return {
        blocked: true,
        reason: 'This content has been flagged for safety reasons.',
        severity: 'high',
        shouldAlert: true,
      };
    }
  }

  return { blocked: false };
}

async function runLlamaGuard(content: string): Promise<{ unsafe: boolean; category?: string }> {
  const guardModel = process.env.TOGETHER_MODEL_GUARD_TEXT;

  if (!guardModel) {
    return { unsafe: false };
  }

  try {
    const response = await axios.post(
      `${process.env.TOGETHER_BASE_URL}/v1/chat/completions`,
      {
        model: guardModel,
        messages: [
          {
            role: 'user',
            content: `[INST] Task: Check if there is unsafe content in 'User' messages in conversations according our safety policy with the below categories.

<BEGIN UNSAFE CONTENT CATEGORIES>
O1: Violence and Hate.
O2: Sexual Content.
O3: Criminal Planning.
O4: Guns and Illegal Weapons.
O5: Regulated or Controlled Substances.
O6: Self-Harm.
O7: Child Exploitation.
<END UNSAFE CONTENT CATEGORIES>

<BEGIN CONVERSATION>
User: ${content}
<END CONVERSATION>

Provide your safety assessment for User message. [/INST]`,
          },
        ],
        max_tokens: 100,
        temperature: 0.1,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.TOGETHER_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const result = response.data.choices[0].message.content.toLowerCase();

    if (result.includes('unsafe')) {
      const category = result.includes('o1') ? 'violence' :
                      result.includes('o3') ? 'illegal' :
                      result.includes('o7') ? 'exploitation' : 'unknown';

      return { unsafe: true, category };
    }

    return { unsafe: false };
  } catch (error) {
    console.error('Llama Guard error:', error);
    return { unsafe: false };
  }
}

async function flagContent(
  userId: string,
  messageId: string | undefined,
  reason: string,
  severity: 'low' | 'medium' | 'high' | 'critical'
): Promise<void> {
  try {
    await supabase.from('content_flags').insert({
      message_id: messageId || null,
      user_id: userId,
      flag_reason: reason,
      severity,
      reviewed: false,
    });
  } catch (error) {
    console.error('Error flagging content:', error);
  }
}

async function sendAlert(
  userId: string,
  content: string,
  keyword: string,
  severity: string
): Promise<void> {
  try {
    // Get user email
    const { data: user } = await supabase
      .from('users')
      .select('email')
      .eq('id', userId)
      .single();

    const userEmail = user?.email || 'unknown';

    // Import email service
    const { sendContentFlagAlert } = await import('@/lib/email/client');

    // Send email alert
    await sendContentFlagAlert(userId, userEmail, content, keyword, severity);

    console.log(`✓ Content alert email sent to ${ALERT_EMAIL}`);
  } catch (error) {
    console.error('Error sending alert:', error);
    // Log to console as fallback
    console.log(`
      🚨 CONTENT ALERT (Email Failed)
      Severity: ${severity}
      User ID: ${userId}
      Keyword: ${keyword}
      Alert Email: ${ALERT_EMAIL}
      Content Preview: ${content.substring(0, 100)}...
    `);
  }
}

export async function reviewFlag(
  flagId: string,
  reviewerId: string,
  decision: 'approved' | 'rejected'
): Promise<void> {
  await supabase
    .from('content_flags')
    .update({
      reviewed: true,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', flagId);
}
