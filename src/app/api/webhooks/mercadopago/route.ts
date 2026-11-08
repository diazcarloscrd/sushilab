import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || searchParams.get('topic');
    const dataId = searchParams.get('data.id') || searchParams.get('id');

    console.log(`Mercado Pago IPN received: type=${type}, dataId=${dataId}`);

    if (type === 'payment' && dataId) {
      // In production, fetch payment details from MP API using MP_ACCESS_TOKEN
      // Then match order by external_reference and update status to APROBADO:
      /*
      await supabase
        .from('Order')
        .update({ paymentStatus: 'APROBADO' })
        .eq('id', externalReference);
      */
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: any) {
    console.error('Error handling Mercado Pago webhook:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
