import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { getAdminSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 1. Obtener órdenes válidas para métricas
    const { data: allOrders, error: orderErr } = await supabaseServer
      .from('Order')
      .select('id, orderNumber, total, subtotal, discount, deliveryFee, status, paymentMethod, paymentStatus, deliveryType, createdAt, customerPhone')
      .order('createdAt', { ascending: false });

    if (orderErr) throw orderErr;

    const orders = allOrders || [];
    const arFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
    const todayArStr = arFormatter.format(new Date());

    // Filtros
    const validOrders = orders.filter((o) => o.status !== 'CANCELADO');
    const todayValidOrders = validOrders.filter(
      (o) => arFormatter.format(new Date(o.createdAt)) === todayArStr
    );

    // Ventas de hoy (excluyendo cancelados)
    const todaySales = todayValidOrders.reduce((acc, o) => acc + (o.total || 0), 0);

    // Conteo de pedidos activos
    const activeOrdersCount = orders.filter((o) =>
      ['PENDIENTE_PAGO', 'PENDIENTE_VERIFICACION', 'CREADO', 'EN_COCINA', 'LISTO', 'EN_CAMINO'].includes(o.status)
    ).length;

    // Ticket promedio real
    const avgTicket = todayValidOrders.length > 0
      ? Math.round(todaySales / todayValidOrders.length)
      : (validOrders.length > 0 ? Math.round(validOrders.reduce((acc, o) => acc + o.total, 0) / validOrders.length) : 0);

    // Clientes únicos reales (no orders.length)
    const uniquePhones = new Set(orders.map((o) => o.customerPhone).filter(Boolean));
    const realCustomersCount = uniquePhones.size;

    // Desglose por Medio de Pago
    const paymentBreakdown: Record<string, { count: number; total: number }> = {
      MERCADO_PAGO: { count: 0, total: 0 },
      TRANSFERENCIA: { count: 0, total: 0 },
      EFECTIVO: { count: 0, total: 0 },
    };
    validOrders.forEach((o) => {
      const pm = o.paymentMethod || 'EFECTIVO';
      if (!paymentBreakdown[pm]) paymentBreakdown[pm] = { count: 0, total: 0 };
      paymentBreakdown[pm].count += 1;
      paymentBreakdown[pm].total += o.total || 0;
    });

    // Desglose por Canal
    const channelBreakdown = {
      delivery: validOrders.filter((o) => o.deliveryType === 'DELIVERY').length,
      takeAway: validOrders.filter((o) => o.deliveryType === 'TAKE_AWAY').length,
    };

    // Alertas de Stock Bajo (Menos de 10 unidades)
    const { data: lowStockProducts } = await supabaseServer
      .from('Product')
      .select('id, name, stock, active')
      .lte('stock', 10)
      .order('stock', { ascending: true });

    return NextResponse.json({
      metrics: {
        todaySales,
        activeOrdersCount,
        averageTicket: avgTicket,
        customersCount: realCustomersCount,
        totalOrdersCount: orders.length,
        cancelledOrdersCount: orders.filter((o) => o.status === 'CANCELADO').length,
        paymentBreakdown,
        channelBreakdown,
        lowStockProducts: lowStockProducts || [],
      },
      recentOrders: orders.slice(0, 10),
    });
  } catch (err: any) {
    console.error('Error calculando métricas:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
