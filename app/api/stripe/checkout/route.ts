import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createCheckoutSession } from '@/lib/payments/stripe';
import { SubscriptionTier } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { tier, seats = 1 } = body;

    if (!tier || !['standard', 'pro', 'team', 'enterprise'].includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    // Validate seats for team/enterprise
    if (tier === 'team' && seats < 2) {
      return NextResponse.json({ error: 'Team tier requires minimum 2 seats' }, { status: 400 });
    }

    if (tier === 'enterprise' && seats < 4) {
      return NextResponse.json({ error: 'Enterprise tier requires minimum 4 seats' }, { status: 400 });
    }

    const checkoutUrl = await createCheckoutSession(user.id, tier as SubscriptionTier, seats);

    return NextResponse.json({ url: checkoutUrl });

  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session', message: error.message },
      { status: 500 }
    );
  }
}
