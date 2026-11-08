import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, orderNumber, items, total, customerEmail } = body;

    const mpAccessToken = process.env.MP_ACCESS_TOKEN;

    // Smart Fallback Mode: If Mercado Pago credentials are not configured, simulate approval
    if (!mpAccessToken || mpAccessToken.trim() === '' || mpAccessToken.includes('APP_USR-...')) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      return NextResponse.json({
        simulated: true,
        init_point: `${appUrl}/pedido/${orderId}?payment_simulated=approved`,
        message: 'Sandbox Simulador Inteligente Activo: Credenciales de Mercado Pago pendientes en .env',
      });
    }

    // Official Mercado Pago Preference
    const client = new MercadoPagoConfig({ accessToken: mpAccessToken });
    const preference = new Preference(client);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const result = await preference.create({
      body: {
        items: items.map((i: any) => ({
          id: i.productId || String(orderNumber),
          title: i.name,
          unit_price: Number(i.price),
          quantity: Number(i.quantity),
          currency_id: 'ARS',
        })),
        payer: {
          email: customerEmail || 'cliente@yankunsushi.com',
        },
        external_reference: String(orderId),
        back_urls: {
          success: `${appUrl}/pedido/${orderId}?status=success`,
          failure: `${appUrl}/pedido/${orderId}?status=failure`,
          pending: `${appUrl}/pedido/${orderId}?status=pending`,
        },
        auto_return: 'approved',
      },
    });

    return NextResponse.json({
      simulated: false,
      init_point: result.init_point,
      id: result.id,
    });
  } catch (err: any) {
    console.error('Error in Mercado Pago route:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
