import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.EMAIL_FROM || 'AeonForge <noreply@aeonforge.com>';
const ALERT_EMAIL = process.env.ALERT_EMAIL || 'info@stephenscode.dev';

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    console.log(`✓ Email sent to ${options.to}: ${options.subject}`);
  } catch (error: any) {
    console.error('Email send error:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

export async function sendContentFlagAlert(
  userId: string,
  userEmail: string,
  content: string,
  keyword: string,
  severity: string
): Promise<void> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 20px; border-radius: 8px; }
        .content { padding: 20px; background: #f3f4f6; border-radius: 8px; margin-top: 20px; }
        .severity { display: inline-block; padding: 5px 10px; border-radius: 4px; font-weight: bold; }
        .critical { background: #dc2626; color: white; }
        .high { background: #ea580c; color: white; }
        .medium { background: #eab308; color: black; }
        .footer { margin-top: 20px; font-size: 12px; color: #6b7280; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>🚨 Content Flag Alert - AeonForge</h2>
        </div>
        <div class="content">
          <p><strong>Severity:</strong> <span class="severity ${severity.toLowerCase()}">${severity.toUpperCase()}</span></p>
          <p><strong>User ID:</strong> ${userId}</p>
          <p><strong>User Email:</strong> ${userEmail}</p>
          <p><strong>Flagged Keyword:</strong> ${keyword}</p>
          <p><strong>Content Preview:</strong></p>
          <blockquote style="background: white; padding: 15px; border-left: 4px solid #dc2626;">
            ${content.substring(0, 500)}${content.length > 500 ? '...' : ''}
          </blockquote>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        </div>
        <div class="footer">
          <p>This is an automated alert from AeonForge content moderation system.</p>
          <p>Review flagged content in the admin dashboard.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: ALERT_EMAIL,
    subject: `[AeonForge] Content Flag - ${severity.toUpperCase()}`,
    html,
  });
}

export async function sendWelcomeEmail(
  email: string,
  name: string
): Promise<void> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 30px; border-radius: 8px; text-align: center; }
        .content { padding: 30px; background: #f9fafb; border-radius: 8px; margin-top: 20px; }
        .button { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        .features { margin: 20px 0; }
        .feature { padding: 10px 0; }
        .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #6b7280; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to AeonForge! 🎉</h1>
        </div>
        <div class="content">
          <p>Hi ${name || 'there'},</p>
          <p>Thank you for joining AeonForge - your advanced AI assistant platform!</p>

          <div class="features">
            <h3>What you can do with AeonForge:</h3>
            <div class="feature">✨ <strong>Multi-LLM Support:</strong> Access Claude, Gemini, and Together.ai models</div>
            <div class="feature">🔬 <strong>Medical Knowledge:</strong> Get answers backed by PubMed research</div>
            <div class="feature">💻 <strong>Coding Assistant:</strong> Production-ready code in any language</div>
            <div class="feature">📚 <strong>RAG System:</strong> Upload documents for context-aware responses</div>
            <div class="feature">📊 <strong>Project Management:</strong> Organize your work with persistent memory</div>
          </div>

          <p>Your current plan: <strong>Free Tier</strong> (10 messages/month)</p>
          <p>Ready to unlock more? Check out our premium plans!</p>

          <a href="${process.env.NEXT_PUBLIC_APP_URL}/chat" class="button">Start Chatting</a>
        </div>
        <div class="footer">
          <p>Need help? Reply to this email or visit our docs.</p>
          <p>AeonForge - Advanced AI Assistant</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: 'Welcome to AeonForge! 🚀',
    html,
  });
}

export async function sendSubscriptionConfirmation(
  email: string,
  name: string,
  tier: string,
  seats?: number
): Promise<void> {
  const tierDetails: Record<string, { tokens: string; storage: string; price: string }> = {
    standard: { tokens: '2M/month', storage: '1 GB', price: '$15' },
    pro: { tokens: 'Unlimited', storage: '5 GB', price: '$40' },
    team: { tokens: '5M/month', storage: '10 GB', price: `$${seats! * 20}` },
    enterprise: { tokens: 'Unlimited', storage: '50 GB', price: `$${seats! * 18}` },
  };

  const details = tierDetails[tier.toLowerCase()];

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; border-radius: 8px; text-align: center; }
        .content { padding: 30px; background: #f9fafb; border-radius: 8px; margin-top: 20px; }
        .plan-details { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
        .button { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Subscription Confirmed!</h1>
        </div>
        <div class="content">
          <p>Hi ${name || 'there'},</p>
          <p>Your subscription to AeonForge <strong>${tier.charAt(0).toUpperCase() + tier.slice(1)}</strong> has been activated!</p>

          <div class="plan-details">
            <h3>Your Plan Details:</h3>
            <div class="detail-row">
              <span>Plan:</span>
              <strong>${tier.charAt(0).toUpperCase() + tier.slice(1)}</strong>
            </div>
            <div class="detail-row">
              <span>Tokens:</span>
              <strong>${details.tokens}</strong>
            </div>
            <div class="detail-row">
              <span>Storage:</span>
              <strong>${details.storage}</strong>
            </div>
            ${seats ? `<div class="detail-row"><span>Seats:</span><strong>${seats}</strong></div>` : ''}
            <div class="detail-row">
              <span>Price:</span>
              <strong>${details.price}/month</strong>
            </div>
          </div>

          <p>You can now enjoy unlimited access to all premium features!</p>

          <a href="${process.env.NEXT_PUBLIC_APP_URL}/chat" class="button">Start Using AeonForge</a>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: `Your AeonForge ${tier} Subscription is Active! 🎉`,
    html,
  });
}

export async function sendPaymentFailedEmail(
  email: string,
  name: string
): Promise<void> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 30px; border-radius: 8px; text-align: center; }
        .content { padding: 30px; background: #f9fafb; border-radius: 8px; margin-top: 20px; }
        .button { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚠️ Payment Failed</h1>
        </div>
        <div class="content">
          <p>Hi ${name || 'there'},</p>
          <p>We were unable to process your recent payment for AeonForge.</p>
          <p>To avoid any interruption to your service, please update your payment method.</p>

          <a href="${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/portal" class="button">Update Payment Method</a>

          <p style="margin-top: 30px;">If you have any questions, please don't hesitate to contact us.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: 'Action Required: Payment Failed - AeonForge',
    html,
  });
}

export async function sendTokenLimitWarning(
  email: string,
  name: string,
  percentageUsed: number
): Promise<void> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f59e0b; color: white; padding: 30px; border-radius: 8px; text-align: center; }
        .content { padding: 30px; background: #f9fafb; border-radius: 8px; margin-top: 20px; }
        .progress-bar { background: #e5e7eb; height: 30px; border-radius: 15px; overflow: hidden; margin: 20px 0; }
        .progress-fill { background: ${percentageUsed >= 90 ? '#dc2626' : '#f59e0b'}; height: 100%; width: ${percentageUsed}%; }
        .button { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚠️ Token Limit Warning</h1>
        </div>
        <div class="content">
          <p>Hi ${name || 'there'},</p>
          <p>You've used <strong>${percentageUsed}%</strong> of your monthly token limit.</p>

          <div class="progress-bar">
            <div class="progress-fill"></div>
          </div>

          <p>To avoid service interruption, consider upgrading to a higher plan.</p>

          <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings" class="button">Upgrade Plan</a>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: `Token Usage Warning: ${percentageUsed}% Used - AeonForge`,
    html,
  });
}
