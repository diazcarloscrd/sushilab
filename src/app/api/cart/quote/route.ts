import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { evaluatePricingRules, CartItemForPricing, PricingRuleCondition } from '@/lib/pricing/engine';
import { checkRateLimit } from '@/lib/rateLimit';

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown_ip';
    const rate = await checkRateLimit({
      key: `quote_${ip}`,
      limit: 120,
      windowSeconds: 60,
    });

    if (!rate.allowed) {
      return NextResponse.json({ error: 'Demasiadas solicitudes. Por favor aguarde.' }, { status: 429 });
    }

    const body = await req.json();
    const {
      items = [],
      deliveryType = 'DELIVERY',
      paymentMethod = 'EFECTIVO',
      deliveryZoneId,
      couponCode,
      customerPhone,
      pointsToRedeem = 0,
    } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({
        valid: false,
        error: 'El carrito está vacío',
        subtotal: 0,
        deliveryFee: 0,
        discounts: [],
        discountTotal: 0,
        total: 0,
      });
    }

    // 1. Cargar productos desde DB
    const productIds = items.map((i: any) => i.productId).filter(Boolean);
    const { data: dbProducts } = await supabaseServer
      .from('Product')
      .select('id, name, price, stock, active, autoPaused, categoryId')
      .in('id', productIds);

    const productMap = new Map<string, any>();
    (dbProducts || []).forEach((p) => productMap.set(p.id, p));

    // 2. Modificadores
    const { data: dbModifiers } = await supabaseServer
      .from('ModifierOption')
      .select('code, name, priceDelta, active')
      .eq('active', true);
    const modifierMap = new Map<string, any>();
    (dbModifiers || []).forEach((m) => modifierMap.set(m.code, m));

    // 3. Resolver costo de delivery
    let deliveryFee = 0;
    if (deliveryType === 'DELIVERY' && deliveryZoneId) {
      const { data: zone } = await supabaseServer
        .from('DeliveryZone')
        .select('id, deliveryFee, active')
        .eq('id', deliveryZoneId)
        .maybeSingle();
      if (zone && zone.active) {
        deliveryFee = zone.deliveryFee || 0;
      }
    }

    // 4. Armar ítems del carrito
    const cartItems: CartItemForPricing[] = [];
    for (const item of items) {
      const prod = productMap.get(item.productId);
      if (!prod || !prod.active || prod.autoPaused) continue;

      let extraPrice = 0;
      if (Array.isArray(item.extras)) {
        for (const ext of item.extras) {
          const mod = modifierMap.get(ext.code || ext.id);
          if (mod) extraPrice += mod.priceDelta || 0;
        }
      }

      cartItems.push({
        productId: prod.id,
        categoryId: prod.categoryId,
        name: prod.name,
        unitPrice: prod.price + extraPrice,
        quantity: Math.max(1, Number(item.quantity) || 1),
      });
    }

    if (cartItems.length === 0) {
      return NextResponse.json({
        valid: false,
        error: 'Los productos seleccionados no están disponibles',
        subtotal: 0,
        deliveryFee: 0,
        discounts: [],
        discountTotal: 0,
        total: 0,
      });
    }

    // 5. Cliente (segmento, nivel, fidelidad)
    let customerContext: any = null;
    let customerPointsBalance = 0;
    if (customerPhone?.trim()) {
      const { data: customer } = await supabaseServer
        .from('Customer')
        .select('id, segment, tier, ordersCount, pointsBalance')
        .eq('phone', customerPhone.trim())
        .maybeSingle();

      if (customer) {
        customerContext = {
          segment: customer.segment || 'NUEVO',
          tier: customer.tier || 'BRONCE',
          isFirstOrder: (customer.ordersCount || 0) === 0,
        };
        customerPointsBalance = customer.pointsBalance || 0;
      }
    }

    // 6. Cupón
    let couponContext: any = null;
    if (couponCode?.trim()) {
      const { data: coupon } = await supabaseServer
        .from('Coupon')
        .select('*')
        .eq('code', couponCode.trim().toUpperCase())
        .eq('active', true)
        .maybeSingle();

      if (coupon) {
        couponContext = {
          code: coupon.code,
          discountPercent: coupon.discountPercent || 0,
          discountAmount: coupon.discountAmount || 0,
          minOrder: coupon.minOrder || 0,
        };
      }
    }

    // 7. Reglas de precio activas
    const { data: rulesRaw } = await supabaseServer
      .from('PricingRule')
      .select('*')
      .eq('active', true)
      .order('priority', { ascending: false });

    const pricingRules: PricingRuleCondition[] = (rulesRaw || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      active: r.active,
      priority: r.priority,
      stackable: r.stackable,
      kind: r.kind,
      validFrom: r.validFrom,
      validTo: r.validTo,
      daysOfWeek: r.daysOfWeek,
      startTime: r.startTime,
      endTime: r.endTime,
      minSubtotal: r.minSubtotal,
      paymentMethods: r.paymentMethods,
      deliveryTypes: r.deliveryTypes,
      productIds: r.productIds,
      categoryIds: r.categoryIds,
      segments: r.segments,
      tiers: r.tiers,
      firstOrderOnly: r.firstOrderOnly,
      percent: r.percent,
      amount: r.amount,
      buyQty: r.buyQty,
      getQty: r.getQty,
      maxDiscount: r.maxDiscount,
    }));

    // 8. Evaluar motor de reglas
    const engineResult = evaluatePricingRules(cartItems, pricingRules, {
      deliveryType,
      paymentMethod,
      deliveryFee,
      customer: customerContext,
      coupon: couponContext,
    });

    // 9. Calcular puntos de fidelidad (Fase 7)
    let pointsDiscount = 0;
    const requestedPoints = Math.max(0, Number(pointsToRedeem) || 0);
    if (requestedPoints >= 100 && customerPointsBalance >= requestedPoints) {
      // 100 pts = $5.000 ($50 por punto). Tope 30% del subtotal neto
      const maxAllowedDiscount = (engineResult.subtotal - engineResult.discountTotal) * 0.3;
      const nominalPointsDiscount = requestedPoints * 50;
      pointsDiscount = Math.min(nominalPointsDiscount, maxAllowedDiscount);

      if (pointsDiscount > 0) {
        engineResult.discounts.push({
          source: 'POINTS',
          id: 'points_redeem',
          label: `Canje de ${requestedPoints} puntos`,
          amount: pointsDiscount,
        });
        engineResult.discountTotal += pointsDiscount;
        engineResult.total = Math.max(0, engineResult.total - pointsDiscount);
      }
    }

    // 10. Reglas cercanas (Gamificación / upsell)
    const nearRules: string[] = [];
    for (const rule of pricingRules) {
      if (rule.minSubtotal && engineResult.subtotal < rule.minSubtotal) {
        const diff = rule.minSubtotal - engineResult.subtotal;
        if (diff > 0 && diff <= 4000) {
          nearRules.push(
            `¡Te faltan $${diff.toLocaleString('es-AR')} para aprovechar "${rule.name}"!`
          );
        }
      }
    }

    return NextResponse.json({
      valid: true,
      subtotal: engineResult.subtotal,
      deliveryFee: engineResult.deliveryFee,
      discounts: engineResult.discounts,
      discountTotal: engineResult.discountTotal,
      pointsDiscount,
      total: engineResult.total,
      nearRules,
    });
  } catch (err: any) {
    console.error('Error in /api/cart/quote:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
