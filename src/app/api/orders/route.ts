import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { getAdminSession } from '@/lib/auth';
import { calculateOrderQuote, DbProductForQuote, DbModifierOptionForQuote } from '@/lib/orders/quote';
import { evaluatePricingRules, CartItemForPricing, PricingRuleCondition } from '@/lib/pricing/engine';
import { calculatePointsDiscount } from '@/lib/loyalty/engine';
import { verifyRedeemToken } from '@/lib/loyalty/token';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
    const offset = (page - 1) * limit;

    const orderId = searchParams.get('orderId');
    if (!session && !orderId) {
      return NextResponse.json(
        { error: 'Acceso no autorizado para listar pedidos históricos' },
        { status: 401 }
      );
    }

    let query = supabaseServer
      .from('Order')
      .select('*, items:OrderItem(*), deliveryZone:DeliveryZone(*)', { count: 'exact' })
      .order('createdAt', { ascending: false })
      .range(offset, offset + limit - 1);

    if (orderId) {
      query = query.eq('id', orderId);
    } else if (status) {
      query = query.eq('status', status);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      orders: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (err: any) {
    console.error('Error fetching orders:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      customerName,
      customerPhone,
      deliveryType = 'DELIVERY',
      deliveryAddress,
      deliveryZoneId,
      paymentMethod = 'EFECTIVO',
      paymentProofUrl,
      couponCode,
      notes = '',
      items = [],
      scheduledFor,
      cashAmountPaid,
      marketingConsent = false,
      pointsToRedeem = 0,
      redeemToken = null,
    } = body;

    if (!customerName?.trim() || !customerPhone?.trim() || !items.length) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos (Nombre, Teléfono o Items vacíos)' },
        { status: 400 }
      );
    }

    // 1. Verificar Turno de Caja Abierto o Local Abierto
    const { data: openShift } = await supabaseServer
      .from('CashShift')
      .select('id')
      .eq('status', 'OPEN')
      .maybeSingle();

    const { data: storeOpenSetting } = await supabaseServer
      .from('StoreSetting')
      .select('value')
      .eq('key', 'STORE_IS_OPEN')
      .maybeSingle();

    const isStoreOpen = Boolean(openShift) || storeOpenSetting?.value !== 'false';

    if (!isStoreOpen && !scheduledFor) {
      return NextResponse.json(
        {
          error: 'El local se encuentra cerrado en este momento. Puedes programar tu pedido para el próximo horario de atención.',
          storeClosed: true,
        },
        { status: 400 }
      );
    }

    // 2. Cargar Productos de la Base de Datos
    const productIds = items
      .map((i: any) => i.productId)
      .filter((id: any) => Boolean(id));

    const { data: dbProductsRaw, error: prodErr } = await supabaseServer
      .from('Product')
      .select('id, name, price, stock, active, autoPaused')
      .in('id', productIds);

    if (prodErr || !dbProductsRaw) {
      throw new Error('Error al validar productos en el catálogo');
    }

    const productMap = new Map<string, DbProductForQuote>();
    dbProductsRaw.forEach((p) => productMap.set(p.id, p));

    // 3. Cargar Modificadores y Opciones oficiales de la Base de Datos
    const { data: dbModifiersRaw } = await supabaseServer
      .from('ModifierOption')
      .select('code, name, priceDelta, active')
      .eq('active', true);

    const modifierMap = new Map<string, DbModifierOptionForQuote>();
    (dbModifiersRaw || []).forEach((m) => modifierMap.set(m.code, m));

    // 4. Resolver y Validar Zona de Envío
    let isWithinDeliveryZone = true;
    let zoneDeliveryFee = 0;
    let zoneMinOrder = 0;
    let resolvedZoneId = deliveryZoneId || null;

    if (deliveryType === 'DELIVERY') {
      if (deliveryZoneId) {
        const { data: zone } = await supabaseServer
          .from('DeliveryZone')
          .select('id, deliveryFee, minOrder, active')
          .eq('id', deliveryZoneId)
          .maybeSingle();

        if (zone && zone.active) {
          zoneDeliveryFee = zone.deliveryFee;
          zoneMinOrder = zone.minOrder;
        } else {
          isWithinDeliveryZone = false;
        }
      } else {
        // Si es delivery pero no seleccionó zona válida
        isWithinDeliveryZone = false;
      }
    }

    // 5. Cargar Cupón si aplica
    let couponData: any = null;
    if (couponCode?.trim()) {
      const { data: cp } = await supabaseServer
        .from('Coupon')
        .select('*')
        .eq('code', couponCode.trim().toUpperCase())
        .eq('active', true)
        .maybeSingle();
      couponData = cp;
    }

    // 6. Cargar Cliente y Reglas de Precio oficiales para cotización avanzada
    const cleanPhone = customerPhone.trim();
    const { data: existingCustomer } = await supabaseServer
      .from('Customer')
      .select('id, deliveryAddress, tags, segment, tier, ordersCount, pointsBalance')
      .eq('phone', cleanPhone)
      .maybeSingle();

    // Validar token de canje de puntos si el usuario solicitó usar puntos
    const requestedPoints = Math.max(0, Number(pointsToRedeem) || 0);
    if (requestedPoints > 0) {
      if (!redeemToken) {
        return NextResponse.json({ error: 'Se requiere token de verificación OTP para canjear puntos' }, { status: 400 });
      }
      const verifiedPayload = await verifyRedeemToken(redeemToken);
      if (!verifiedPayload || verifiedPayload.phone !== cleanPhone) {
        return NextResponse.json({ error: 'Token de canje inválido o expirado' }, { status: 403 });
      }
      if (!existingCustomer || (existingCustomer.pointsBalance || 0) < requestedPoints) {
        return NextResponse.json({ error: 'Saldo de puntos insuficiente' }, { status: 400 });
      }
    }

    // 7. Cotización base de comanda (validación de productos y adicionales)
    const quote = calculateOrderQuote(items, productMap, modifierMap, {
      deliveryType,
      deliveryFee: zoneDeliveryFee,
      minOrderZone: zoneMinOrder,
      isWithinDeliveryZone,
      coupon: couponData,
      takeawayDiscountPercent: 0, // Las reglas de precio manejan el retiro en local
    });

    if (!quote.valid) {
      return NextResponse.json({ error: quote.error }, { status: 400 });
    }

    // 7.1 Evaluación con Motor de Reglas de Precio
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

    const cartItemsForPricing: CartItemForPricing[] = quote.validatedItems.map((item) => ({
      productId: item.productId,
      name: item.name,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
    }));

    const customerContext = existingCustomer ? {
      segment: existingCustomer.segment || 'NUEVO',
      tier: existingCustomer.tier || 'BRONCE',
      isFirstOrder: (existingCustomer.ordersCount || 0) === 0,
    } : null;

    const couponContext = couponData ? {
      code: couponData.code,
      discountPercent: couponData.discountPercent || 0,
      discountAmount: couponData.discountAmount || 0,
      minOrder: couponData.minOrder || 0,
    } : null;

    const pricingResult = evaluatePricingRules(cartItemsForPricing, pricingRules, {
      deliveryType,
      paymentMethod,
      deliveryFee: zoneDeliveryFee,
      customer: customerContext,
      coupon: couponContext,
    });

    // 7.2 Canje de Puntos de Fidelidad
    let pointsDiscount = 0;
    let acceptedPoints = 0;
    if (requestedPoints >= 100 && existingCustomer) {
      const netSub = Math.max(0, pricingResult.subtotal - pricingResult.discountTotal);
      const ptsRes = calculatePointsDiscount(requestedPoints, netSub, existingCustomer.pointsBalance || 0);
      pointsDiscount = ptsRes.discountAmount;
      acceptedPoints = ptsRes.pointsAccepted;
    }

    const appliedDiscounts = [...pricingResult.discounts];
    if (pointsDiscount > 0) {
      appliedDiscounts.push({
        source: 'POINTS',
        id: 'points_redeem',
        label: `Canje de ${acceptedPoints} puntos`,
        amount: pointsDiscount,
      });
    }

    const finalDiscountTotal = pricingResult.discountTotal + pointsDiscount;
    const finalTotal = Math.max(0, pricingResult.subtotal + zoneDeliveryFee - finalDiscountTotal);

    // 8. Incrementar Cupón de forma atómica si fue utilizado
    if (couponData && pricingResult.discounts.some((d) => d.source === 'COUPON')) {
      const { data: updatedCoupon, error: couponUpdateErr } = await supabaseServer
        .from('Coupon')
        .update({ usedCount: (couponData.usedCount || 0) + 1 })
        .eq('id', couponData.id)
        .select('id, usedCount')
        .single();

      if (couponUpdateErr || !updatedCoupon) {
        return NextResponse.json({ error: 'El cupón no pudo ser aplicado o ya alcanzó su límite' }, { status: 400 });
      }
    }

    // 8.1 Descontar puntos canjeados de inmediato
    if (acceptedPoints > 0 && existingCustomer) {
      await supabaseServer
        .from('Customer')
        .update({ pointsBalance: Math.max(0, (existingCustomer.pointsBalance || 0) - acceptedPoints) })
        .eq('id', existingCustomer.id);

      await supabaseServer.from('LoyaltyLedger').insert({
        id: `red_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        customerId: existingCustomer.id,
        type: 'REDEEM',
        points: -acceptedPoints,
        remaining: 0,
        note: `Canje de puntos en comanda`,
        createdAt: new Date().toISOString(),
      });
    }

    // 9. Determinar Estados Iniciales
    let initialStatus = 'EN_COCINA';
    let initialPaymentStatus = 'PENDIENTE';

    if (paymentMethod === 'MERCADO_PAGO') {
      initialStatus = 'PENDIENTE_PAGO';
      initialPaymentStatus = 'PENDIENTE';
    } else if (paymentMethod === 'TRANSFERENCIA') {
      initialStatus = 'PENDIENTE_VERIFICACION';
      initialPaymentStatus = 'PENDIENTE';
    } else if (paymentMethod === 'EFECTIVO') {
      initialStatus = isStoreOpen ? 'EN_COCINA' : 'CREADO';
      initialPaymentStatus = 'PENDIENTE';
    }

    const parsedCashPaid = Number(cashAmountPaid) || null;
    const cashChange = parsedCashPaid && parsedCashPaid > finalTotal ? parsedCashPaid - finalTotal : null;

    // 10. Upsert de Cliente (sin inflar ventas históricas hasta la entrega)
    let customerId: string | null = null;

    if (existingCustomer) {
      customerId = existingCustomer.id;
      const updateCustomerPayload: any = {
        name: customerName.trim(),
        deliveryAddress: deliveryAddress || existingCustomer.deliveryAddress,
      };
      if (marketingConsent) {
        updateCustomerPayload.marketingConsent = true;
        updateCustomerPayload.marketingConsentAt = new Date().toISOString();
      }
      await supabaseServer
        .from('Customer')
        .update(updateCustomerPayload)
        .eq('id', customerId);
    } else {
      const { data: newCustomer } = await supabaseServer
        .from('Customer')
        .insert({
          name: customerName.trim(),
          phone: cleanPhone,
          deliveryAddress: deliveryAddress || null,
          ordersCount: 0,
          totalSpent: 0,
          marketingConsent: Boolean(marketingConsent),
          marketingConsentAt: marketingConsent ? new Date().toISOString() : null,
          firstOrderAt: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (newCustomer) {
        customerId = newCustomer.id;
      }
    }

    // 11. Crear Orden en Base de Datos
    const { data: order, error: orderError } = await supabaseServer
      .from('Order')
      .insert({
        customerId,
        customerName: customerName.trim(),
        customerPhone: cleanPhone,
        deliveryType,
        deliveryAddress: deliveryType === 'TAKE_AWAY' ? 'Retiro en Local (Alsina 350, Bahía Blanca)' : deliveryAddress,
        deliveryZoneId: deliveryType === 'DELIVERY' ? resolvedZoneId : null,
        deliveryFee: zoneDeliveryFee,
        subtotal: pricingResult.subtotal,
        discount: finalDiscountTotal,
        total: finalTotal,
        discountBreakdown: JSON.stringify(appliedDiscounts),
        pointsRedeemed: acceptedPoints,
        pointsDiscount,
        status: initialStatus,
        paymentMethod,
        paymentStatus: initialPaymentStatus,
        paymentProofUrl: paymentProofUrl || null,
        notes,
        estimatedMinutes: deliveryType === 'TAKE_AWAY' ? 20 : 35,
        scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : null,
        cashAmountPaid: parsedCashPaid,
        cashChange,
        shiftId: openShift?.id || null,
        cashCollectedBy: paymentMethod === 'EFECTIVO' ? (deliveryType === 'TAKE_AWAY' ? 'LOCAL' : 'COURIER') : null,
      })
      .select()
      .single();

    if (orderError || !order) {
      throw orderError || new Error('No se pudo registrar la comanda');
    }

    // 12. Insertar Items de la Orden
    const itemsToInsert = quote.validatedItems.map((item) => ({
      orderId: order.id,
      productId: item.productId,
      name: item.name,
      price: item.unitPrice,
      quantity: item.quantity,
      baseRice: item.baseRice,
      saucesJson: item.saucesJson,
      extrasJson: item.extrasJson,
      notes: item.notes,
    }));

    const { error: itemsError } = await supabaseServer.from('OrderItem').insert(itemsToInsert);
    if (itemsError) {
      console.error('Error insertando OrderItems:', itemsError);
    }

    // 13. Registrar en OrderStatusHistory
    await supabaseServer.from('OrderStatusHistory').insert({
      orderId: order.id,
      previousStatus: null,
      newStatus: initialStatus,
      changedBy: 'WEB_CHECKOUT',
      notes: `Comanda ingresada por cliente. Total recalculado: $${quote.total}`,
      createdAt: new Date().toISOString(),
    });

    // 13.1 Si ingresa directamente en cocina, descontar insumos
    if (initialStatus === 'EN_COCINA') {
      try {
        const { consumeOrderStock } = await import('@/lib/inventory/stockService');
        await consumeOrderStock(order.id);
      } catch (stockErr) {
        console.error('Error consumiendo stock inicial:', stockErr);
      }
    }

    // 14. Registrar Auditoría
    await logAudit({
      userName: customerName,
      action: 'ORDER_CREATED',
      entity: 'Order',
      entityId: order.id,
      after: { total: quote.total, itemsCount: items.length, status: initialStatus },
    });

    return NextResponse.json(
      {
        ...order,
        items: quote.validatedItems,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('Error creando orden:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
