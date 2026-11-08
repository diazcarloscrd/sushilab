import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { computeMenuEngineering } from '@/lib/reports/engine';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tab = searchParams.get('tab') || 'sales';
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    // Fechas por defecto: últimos 30 días
    const now = new Date();
    const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const defaultTo = now.toISOString();

    const fromDate = fromParam ? new Date(fromParam).toISOString() : defaultFrom;
    const toDate = toParam ? new Date(toParam).toISOString() : defaultTo;

    if (tab === 'sales') {
      const { data: orders, error } = await supabaseServer
        .from('Order')
        .select('id, total, status, deliveryType, paymentMethod, createdAt')
        .gte('createdAt', fromDate)
        .lte('createdAt', toDate);

      if (error) throw error;

      const validOrders = (orders || []).filter((o) => o.status !== 'CANCELADO');
      const cancelledOrders = (orders || []).filter((o) => o.status === 'CANCELADO');

      const totalSales = validOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      const ordersCount = validOrders.length;
      const averageTicket = ordersCount > 0 ? Math.round(totalSales / ordersCount) : 0;

      const deliveryOrders = validOrders.filter((o) => o.deliveryType === 'DELIVERY');
      const takeawayOrders = validOrders.filter((o) => o.deliveryType === 'TAKE_AWAY');

      const channelMix = {
        deliveryCount: deliveryOrders.length,
        deliverySales: deliveryOrders.reduce((sum, o) => sum + (o.total || 0), 0),
        takeawayCount: takeawayOrders.length,
        takeawaySales: takeawayOrders.reduce((sum, o) => sum + (o.total || 0), 0),
      };

      const paymentMix: Record<string, { count: number; total: number }> = {};
      validOrders.forEach((o) => {
        const pm = o.paymentMethod || 'OTRO';
        if (!paymentMix[pm]) paymentMix[pm] = { count: 0, total: 0 };
        paymentMix[pm].count += 1;
        paymentMix[pm].total += o.total || 0;
      });

      // Ventas diarias
      const dailyMap = new Map<string, { sales: number; count: number }>();
      validOrders.forEach((o) => {
        const d = o.createdAt.split('T')[0];
        const cur = dailyMap.get(d) || { sales: 0, count: 0 };
        cur.sales += o.total || 0;
        cur.count += 1;
        dailyMap.set(d, cur);
      });

      const dailySales = Array.from(dailyMap.entries())
        .map(([date, val]) => ({ date, sales: val.sales, count: val.count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return NextResponse.json({
        tab: 'sales',
        from: fromDate,
        to: toDate,
        totalSales,
        ordersCount,
        averageTicket,
        cancelledCount: cancelledOrders.length,
        cancelledAmount: cancelledOrders.reduce((s, o) => s + (o.total || 0), 0),
        channelMix,
        paymentMix,
        dailySales,
      });
    }

    if (tab === 'food_cost' || tab === 'menu') {
      // Cargar productos con costo y precio
      const { data: products } = await supabaseServer
        .from('Product')
        .select('id, name, price, costPrice');

      const prodMap = new Map<string, any>();
      (products || []).forEach((p) => prodMap.set(p.id, p));

      // Cargar items de pedidos entregados o activos
      const { data: orderItems, error: itemsErr } = await supabaseServer
        .from('OrderItem')
        .select('productId, name, price, quantity, order:Order(status, createdAt)')
        .gte('order.createdAt', fromDate)
        .lte('order.createdAt', toDate);

      if (itemsErr) throw itemsErr;

      const salesByProd = new Map<string, { name: string; unitsSold: number; revenue: number; price: number }>();

      (orderItems || []).forEach((item: any) => {
        if (!item.order || item.order.status === 'CANCELADO') return;
        const pid = item.productId;
        const cur = salesByProd.get(pid) || {
          name: item.name,
          unitsSold: 0,
          revenue: 0,
          price: item.price || 0,
        };
        cur.unitsSold += item.quantity || 1;
        cur.revenue += (item.price || 0) * (item.quantity || 1);
        salesByProd.set(pid, cur);
      });

      const rawItems = Array.from(salesByProd.entries()).map(([pid, data]) => {
        const pRecord = prodMap.get(pid);
        const unitCost = pRecord?.costPrice || Math.round(data.price * 0.30); // 30% estimado si falta receta
        return {
          productId: pid,
          name: data.name,
          unitsSold: data.unitsSold,
          sellingPrice: data.price,
          unitCost,
        };
      });

      if (tab === 'menu') {
        const menuReport = computeMenuEngineering(rawItems, fromDate, toDate);
        return NextResponse.json({ tab: 'menu', ...menuReport });
      }

      // Food cost items
      let totalRevenue = 0;
      let totalTheoreticalCost = 0;

      const items = rawItems.map((item) => {
        const revenue = item.unitsSold * item.sellingPrice;
        const theoreticalTotalCost = item.unitsSold * item.unitCost;
        const grossMargin = revenue - theoreticalTotalCost;
        const foodCostPct = revenue > 0 ? Math.round((theoreticalTotalCost / revenue) * 1000) / 10 : 0;

        totalRevenue += revenue;
        totalTheoreticalCost += theoreticalTotalCost;

        return {
          productId: item.productId,
          name: item.name,
          unitsSold: item.unitsSold,
          revenue,
          theoreticalUnitCost: item.unitCost,
          theoreticalTotalCost,
          grossMargin,
          foodCostPct,
        };
      });

      const overallFoodCostPct = totalRevenue > 0
        ? Math.round((totalTheoreticalCost / totalRevenue) * 1000) / 10
        : 0;

      return NextResponse.json({
        tab: 'food_cost',
        from: fromDate,
        to: toDate,
        totalRevenue,
        totalTheoreticalCost,
        overallFoodCostPct,
        wasteCost: 0,
        items,
      });
    }

    if (tab === 'zones') {
      const { data: zones } = await supabaseServer
        .from('DeliveryZone')
        .select('id, name, deliveryFee, courierFee');

      const { data: orders } = await supabaseServer
        .from('Order')
        .select('id, total, deliveryFee, courierFee, deliveryZoneId, status')
        .eq('deliveryType', 'DELIVERY')
        .gte('createdAt', fromDate)
        .lte('createdAt', toDate);

      const zoneMap = new Map<string, any>();
      (zones || []).forEach((z) => {
        zoneMap.set(z.id, {
          zoneId: z.id,
          zoneName: z.name,
          ordersCount: 0,
          salesTotal: 0,
          feesCollected: 0,
          courierCosts: 0,
          netDeliveryProfit: 0,
          averageTicket: 0,
        });
      });

      const validOrders = (orders || []).filter((o) => o.status !== 'CANCELADO');

      validOrders.forEach((o) => {
        if (!o.deliveryZoneId) return;
        const z = zoneMap.get(o.deliveryZoneId);
        if (z) {
          z.ordersCount += 1;
          z.salesTotal += o.total || 0;
          z.feesCollected += o.deliveryFee || 0;
          z.courierCosts += o.courierFee || 0;
        }
      });

      const zoneList = Array.from(zoneMap.values()).map((z) => {
        z.netDeliveryProfit = z.feesCollected - z.courierCosts;
        z.averageTicket = z.ordersCount > 0 ? Math.round(z.salesTotal / z.ordersCount) : 0;
        return z;
      });

      return NextResponse.json({
        tab: 'zones',
        from: fromDate,
        to: toDate,
        totalOrders: validOrders.length,
        totalSales: validOrders.reduce((s, o) => s + (o.total || 0), 0),
        totalFeesCollected: validOrders.reduce((s, o) => s + (o.deliveryFee || 0), 0),
        totalCourierCosts: validOrders.reduce((s, o) => s + (o.courierFee || 0), 0),
        netDeliveryProfitTotal: validOrders.reduce((s, o) => s + ((o.deliveryFee || 0) - (o.courierFee || 0)), 0),
        zones: zoneList,
      });
    }

    if (tab === 'customers') {
      const { data: customers } = await supabaseServer
        .from('Customer')
        .select('id, segment, tier, ordersCount, pointsBalance, totalSpent, firstOrderAt');

      const totalCustomers = (customers || []).length;
      const segmentCounts: Record<string, number> = {};
      const tierCounts: Record<string, number> = {};
      let totalPoints = 0;
      let newCount = 0;

      (customers || []).forEach((c) => {
        const seg = c.segment || 'NUEVO';
        segmentCounts[seg] = (segmentCounts[seg] || 0) + 1;

        const tier = c.tier || 'BRONCE';
        tierCounts[tier] = (tierCounts[tier] || 0) + 1;

        totalPoints += c.pointsBalance || 0;

        if (c.firstOrderAt && new Date(c.firstOrderAt) >= new Date(fromDate)) {
          newCount += 1;
        }
      });

      const pointsLiabilityARS = totalPoints * 50;

      return NextResponse.json({
        tab: 'customers',
        from: fromDate,
        to: toDate,
        totalCustomers,
        newCustomersCount: newCount,
        returningCustomersCount: Math.max(0, totalCustomers - newCount),
        segmentCounts,
        tierCounts,
        activePointsBalance: totalPoints,
        pointsLiabilityARS,
      });
    }

    return NextResponse.json({ error: 'Reporte no reconocido' }, { status: 400 });
  } catch (err: any) {
    console.error('Error fetching admin reports:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
