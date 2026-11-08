import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { checkRateLimit } from '@/lib/rateLimit';
import { POINT_VALUE_ARS, MIN_REDEEM_POINTS } from '@/lib/loyalty/engine';

export async function GET(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown_ip';
    const rate = await checkRateLimit({
      key: `balance_ip_${ip}`,
      limit: 60,
      windowSeconds: 3600,
    });

    if (!rate.allowed) {
      return NextResponse.json({ error: 'Demasiadas consultas de saldo' }, { status: 429 });
    }

    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone');

    if (!phone || phone.trim().length < 8) {
      return NextResponse.json({ points: 0, tier: 'BRONCE', pointValue: POINT_VALUE_ARS, minRedeemPoints: MIN_REDEEM_POINTS });
    }

    const cleanPhone = phone.trim();

    const { data: customer } = await supabaseServer
      .from('Customer')
      .select('pointsBalance, tier')
      .eq('phone', cleanPhone)
      .maybeSingle();

    return NextResponse.json({
      points: customer?.pointsBalance || 0,
      tier: customer?.tier || 'BRONCE',
      pointValue: POINT_VALUE_ARS,
      minRedeemPoints: MIN_REDEEM_POINTS,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
