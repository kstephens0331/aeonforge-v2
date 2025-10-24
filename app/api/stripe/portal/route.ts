import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createPortalSession } from '@/lib/payments/stripe';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const portalUrl = await createPortalSession(user.id);

    return NextResponse.json({ url: portalUrl });

  } catch (error: any) {
    console.error('Portal error:', error);
    return NextResponse.json(
      { error: 'Failed to create portal session', message: error.message },
      { status: 500 }
    );
  }
}
