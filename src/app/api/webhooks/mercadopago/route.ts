import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { supabaseServer } from '@/lib/supabaseServer';
import { transitionOrder } from '@/lib/orders/transitionOrder';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || searchParams.get('topic');
    const dataId = searchParams.get('data.id') || searchParams.get('id');

    // Validación Criptográfica x-signature de Mercado Pago (C6 & A2-9)
    const xSignature = req.headers.get('x-signature');
    const xRequestId = req.headers.get('x-request-id');
    const webhookSecret = process.env.MP_WEBHOOK_SECRET;

    if (webhookSecret && webhookSecret.trim() !== '') {
      if (!xSignature || !dataId) {
        console.warn('⚠️ Webhook de Mercado Pago rechazado: firma x-signature ausente');
        return NextResponse.json({ error: 'Firma x-signature requerida' }, { status: 401 });
      }

      const parts = xSignature.split(',').reduce((acc: Record<string, string>, part) => {
        const [k, v] = part.trim().split('=');
        if (k && v) acc[k] = v;
        return acc;
      }, {});

      const ts = parts.ts;
      const hash = parts.v1;

      if (!ts || !hash) {
        return NextResponse.json({ error: 'Formato de firma inválido' }, { status: 401 });
      }

      const manifest = `id:${dataId};request-id:${xRequestId || ''};ts:${ts};`;
      const expectedHash = crypto
        .createHmac('sha256', webhookSecret)
        .update(manifest)
        .digest('hex');

      const hashBuf = Buffer.from(hash);
      const expectedBuf = Buffer.from(expectedHash);

      if (hashBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(hashBuf, expectedBuf)) {
        console.warn('⚠️ Webhook de Mercado Pago rechazado: hash criptográfico inválido');
        return NextResponse.json({ error: 'Firma de webhook inválida' }, { status: 401 });
      }
    }

    const mpAccessToken = process.env.MP_ACCESS_TOKEN;

    // Solo procesar si el evento es de pago
    if ((type === 'payment' || searchParams.get('topic') === 'payment') && dataId) {
      if (mpAccessToken && mpAccessToken.trim() !== '' && !mpAccessToken.includes('APP_USR-...')) {
        const client = new MercadoPagoConfig({ accessToken: mpAccessToken });
        const paymentClient = new Payment(client);

        const payment = await paymentClient.get({ id: dataId });
        const orderId = payment.external_reference;

        if (orderId && payment.status === 'approved') {
          await transitionOrder(orderId, 'EN_COCINA', 'MERCADO_PAGO_WEBHOOK', {
            paymentStatus: 'APROBADO',
            mpPaymentId: String(payment.id),
            notes: `Pago acreditado exitosamente por Mercado Pago (Pago #${payment.id}, Monto: $${payment.transaction_amount})`,
          });
          console.log(`✅ Pedido #${orderId} acreditado por MP y pasado a Cocina KDS`);
        }
      } else {
        console.log(`Mercado Pago Webhook (Modo Simulación): Evento de pago recibido id=${dataId}`);
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: any) {
    console.error('Error procesando webhook de Mercado Pago:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
