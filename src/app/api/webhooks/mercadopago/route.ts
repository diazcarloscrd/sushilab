import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { supabaseServer } from '@/lib/supabaseServer';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || searchParams.get('topic');
    const dataId = searchParams.get('data.id') || searchParams.get('id');

    // Validación de Firma Criptográfica x-signature de Mercado Pago (C6)
    const xSignature = req.headers.get('x-signature');
    const xRequestId = req.headers.get('x-request-id');
    const webhookSecret = process.env.MP_WEBHOOK_SECRET;

    if (webhookSecret && xSignature && dataId) {
      // Extraer ts y v1 del header x-signature
      const parts = xSignature.split(',').reduce((acc: Record<string, string>, part) => {
        const [k, v] = part.trim().split('=');
        if (k && v) acc[k] = v;
        return acc;
      }, {});

      const ts = parts.ts;
      const hash = parts.v1;

      if (ts && hash) {
        // Formato oficial de manifest de Mercado Pago: id:[data.id];request-id:[x-request-id];ts:[ts];
        const manifest = `id:${dataId};request-id:${xRequestId || ''};ts:${ts};`;
        const expectedHash = crypto
          .createHmac('sha256', webhookSecret)
          .update(manifest)
          .digest('hex');

        if (expectedHash !== hash) {
          console.warn('⚠️ Webhook de Mercado Pago rechazado: firma inválida');
          return NextResponse.json({ error: 'Firma de webhook inválida' }, { status: 401 });
        }
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
          // 1. Obtener estado previo de la orden
          const { data: order } = await supabaseServer
            .from('Order')
            .select('id, status, paymentStatus')
            .eq('id', orderId)
            .maybeSingle();

          if (order && order.paymentStatus !== 'APROBADO') {
            // 2. Actualizar la orden a APROBADO y EN_COCINA
            await supabaseServer
              .from('Order')
              .update({
                paymentStatus: 'APROBADO',
                status: 'EN_COCINA',
                updatedAt: new Date().toISOString(),
              })
              .eq('id', orderId);

            // 3. Registrar en OrderStatusHistory
            await supabaseServer.from('OrderStatusHistory').insert({
              orderId,
              previousStatus: order.status,
              newStatus: 'EN_COCINA',
              changedBy: 'MERCADO_PAGO_WEBHOOK',
              notes: `Pago acreditado exitosamente por Mercado Pago (Pago #${payment.id}, Monto: $${payment.transaction_amount})`,
            });

            console.log(`✅ Pedido #${orderId} confirmado y enviado a Cocina KDS`);
          }
        }
      } else {
        console.log(`Mercado Pago Webhook (Modo Sandbox): Evento de pago recibido id=${dataId}`);
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: any) {
    console.error('Error procesando webhook de Mercado Pago:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
