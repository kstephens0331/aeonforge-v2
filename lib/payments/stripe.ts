import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { SubscriptionTier } from '@/types';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Price IDs from Stripe Dashboard
const PRICE_IDS = {
  standard: process.env.STRIPE_PRICE_STANDARD!,
  pro: process.env.STRIPE_PRICE_PRO!,
  team: process.env.STRIPE_PRICE_TEAM!,
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE!,
};

export async function createCheckoutSession(
  userId: string,
  tier: SubscriptionTier,
  seats: number = 1
): Promise<string> {
  if (tier === 'free') {
    throw new Error('Cannot create checkout for free tier');
  }

  const { data: user } = await supabase
    .from('users')
    .select('email')
    .eq('id', userId)
    .single();

  if (!user) {
    throw new Error('User not found');
  }

  let priceId = PRICE_IDS[tier];
  let quantity = 1;

  // For team/enterprise, use seat-based pricing
  if (tier === 'team' || tier === 'enterprise') {
    quantity = seats;
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity,
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings`,
    customer_email: user.email,
    client_reference_id: userId,
    metadata: {
      userId,
      tier,
      seats: seats.toString(),
    },
  });

  return session.url!;
}

export async function createPortalSession(userId: string): Promise<string> {
  const { data: user } = await supabase
    .from('users')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single();

  if (!user?.stripe_customer_id) {
    throw new Error('No Stripe customer found');
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings`,
  });

  return session.url;
}

export async function handleWebhook(
  body: string,
  signature: string
): Promise<void> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    throw new Error(`Webhook signature verification failed: ${err.message}`);
  }

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;

    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;

    case 'invoice.payment_succeeded':
      await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
      break;

    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.Invoice);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const tier = session.metadata?.tier as SubscriptionTier;
  const seats = parseInt(session.metadata?.seats || '1');

  if (!userId || !tier) return;

  // Get or create customer
  let customerId = session.customer as string;

  // Update user with subscription info
  await supabase
    .from('users')
    .update({
      subscription_tier: tier,
      stripe_customer_id: customerId,
      stripe_subscription_id: session.subscription as string,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  console.log(`✓ Subscription activated for user ${userId}: ${tier}`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!user) return;

  // Determine tier from price ID
  const priceId = subscription.items.data[0].price.id;
  let tier: SubscriptionTier = 'free';

  if (priceId === PRICE_IDS.standard) tier = 'standard';
  else if (priceId === PRICE_IDS.pro) tier = 'pro';
  else if (priceId === PRICE_IDS.team) tier = 'team';
  else if (priceId === PRICE_IDS.enterprise) tier = 'enterprise';

  await supabase
    .from('users')
    .update({
      subscription_tier: tier,
      stripe_subscription_id: subscription.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  console.log(`✓ Subscription updated for user ${user.id}: ${tier}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!user) return;

  await supabase
    .from('users')
    .update({
      subscription_tier: 'free',
      stripe_subscription_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  console.log(`✓ Subscription cancelled for user ${user.id}`);
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log(`✓ Payment succeeded for invoice ${invoice.id}`);
  // Could send a receipt email here
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  const { data: user } = await supabase
    .from('users')
    .select('email')
    .eq('stripe_customer_id', customerId)
    .single();

  console.error(`✗ Payment failed for user ${user?.email}: ${invoice.id}`);
  // Could send a payment failed email here
}

export async function getUsageStats(userId: string): Promise<{
  tokensUsedThisMonth: number;
  tokensLimit: number;
  storageUsed: number;
  storageLimit: number;
  percentageUsed: number;
}> {
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (!user) {
    throw new Error('User not found');
  }

  const limits = {
    free: { tokens: 0, storage: 107374182 },
    standard: { tokens: 2000000, storage: 1073741824 },
    pro: { tokens: -1, storage: 5368709120 },
    team: { tokens: 5000000, storage: 10737418240 },
    enterprise: { tokens: -1, storage: 53687091200 },
  };

  const tier = user.subscription_tier as SubscriptionTier;
  const limit = limits[tier];

  return {
    tokensUsedThisMonth: user.tokens_used_this_month || 0,
    tokensLimit: limit.tokens,
    storageUsed: user.storage_used_bytes || 0,
    storageLimit: limit.storage,
    percentageUsed: limit.tokens > 0
      ? (user.tokens_used_this_month / limit.tokens) * 100
      : 0,
  };
}
