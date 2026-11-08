import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { getAdminSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
    const offset = (page - 1) * limit;

    // Si no es admin, solo permitir consultar por un id o número específico
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
    } = body;

    if (!customerName?.trim() || !customerPhone?.trim() || !items.length) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios para generar la comanda (Nombre, Teléfono o Items vacíos)' },
        { status: 400 }
      );
    }

    // 1. Verificar si el local está abierto
    const { data: storeOpenSetting } = await supabaseServer
      .from('StoreSetting')
      .select('value')
      .eq('key', 'STORE_IS_OPEN')
      .maybeSingle();

    const isStoreOpen = storeOpenSetting?.value !== 'false';
    if (!isStoreOpen && !scheduledFor) {
      return NextResponse.json(
        {
          error: 'El local se encuentra cerrado en este momento. Puedes programar tu pedido para el próximo horario de atención.',
          storeClosed: true,
        },
        { status: 400 }
      );
    }

    // 2. RECALCULAR PRECIOS EN SERVIDOR (C5 Solución Definitiva)
    const productIds = items
      .map((i: any) => i.productId)
      .filter((id: any) => Boolean(id));

    const { data: dbProducts, error: prodErr } = await supabaseServer
      .from('Product')
      .select('id, name, price, stock, active')
      .in('id', productIds);

    if (prodErr || !dbProducts) {
      throw new Error('Error validando disponibilidad de los productos en el catálogo');
    }

    const productMap = new Map<string, any>();
    dbProducts.forEach((p) => productMap.set(p.id, p));

    // Precios oficiales de extras para evitar manipulación en frontend
    const OFFICIAL_EXTRAS_PRICES: Record<string, number> = {
      palta: 950,
      masago: 1400,
      wasabi: 1200,
      gari: 400,
    };

    let serverSubtotal = 0;
    const validatedOrderItems: any[] = [];

    for (const item of items) {
      const dbProduct = productMap.get(item.productId);
      if (!dbProduct) {
        return NextResponse.json(
          { error: `El producto "${item.name}" ya no se encuentra en el menú` },
          { status: 400 }
        );
      }

      if (!dbProduct.active || dbProduct.stock <= 0) {
        return NextResponse.json(
          { error: `El producto "${dbProduct.name}" se encuentra agotado` },
          { status: 400 }
        );
      }

      const qty = Math.max(1, parseInt(item.quantity) || 1);
      let itemUnitPrice = dbProduct.price;

      // Parsear extras si existen y sumar sus valores reales
      let parsedExtras: any[] = [];
      try {
        parsedExtras = Array.isArray(item.extras)
          ? item.extras
          : (typeof item.extrasJson === 'string' ? JSON.parse(item.extrasJson) : []);
      } catch {
        parsedExtras = [];
      }

      for (const extra of parsedExtras) {
        const extraPrice = OFFICIAL_EXTRAS_PRICES[extra.id] || Number(extra.price) || 0;
        itemUnitPrice += extraPrice;
      }

      serverSubtotal += itemUnitPrice * qty;

      validatedOrderItems.push({
        productId: dbProduct.id,
        name: dbProduct.name,
        price: itemUnitPrice,
        quantity: qty,
        baseRice: item.baseRice || null,
        saucesJson: typeof item.saucesJson === 'string' ? item.saucesJson : JSON.stringify(item.sauces || []),
        extrasJson: JSON.stringify(parsedExtras),
        notes: item.notes || null,
      });
    }

    // 3. Validar Tarifa de Envío real en Bahía Blanca
    let serverDeliveryFee = 0;
    if (deliveryType === 'DELIVERY') {
      if (deliveryZoneId) {
        const { data: zone } = await supabaseServer
          .from('DeliveryZone')
          .select('id, deliveryFee, minOrder, active')
          .eq('id', deliveryZoneId)
          .maybeSingle();

        if (zone && zone.active) {
          serverDeliveryFee = zone.deliveryFee;
          if (serverSubtotal < zone.minOrder) {
            return NextResponse.json(
              { error: `El pedido mínimo para esta zona de Bahía Blanca es de $${zone.minOrder.toLocaleString('es-AR')}` },
              { status: 400 }
            );
          }
        } else {
          serverDeliveryFee = 1200; // Tarifa centro base
        }
      } else {
        serverDeliveryFee = 1200;
      }
    }

    // 4. Calcular Descuentos Oficiales
    let serverDiscount = 0;

    // Descuento Take Away (15% oficial)
    if (deliveryType === 'TAKE_AWAY') {
      const { data: takeawaySetting } = await supabaseServer
        .from('StoreSetting')
        .select('value')
        .eq('key', 'TAKEAWAY_DISCOUNT_PERCENT')
        .maybeSingle();
      const pct = Number(takeawaySetting?.value || '15');
      serverDiscount = Math.round(serverSubtotal * (pct / 100));
    } else if (couponCode?.trim()) {
      // Validar Cupón contra la base de datos
      const { data: coupon } = await supabaseServer
        .from('Coupon')
        .select('*')
        .eq('code', couponCode.trim().toUpperCase())
        .eq('active', true)
        .maybeSingle();

      if (coupon && serverSubtotal >= coupon.minOrder) {
        if (!coupon.expiresAt || new Date(coupon.expiresAt) >= new Date()) {
          if (!coupon.maxUses || coupon.usedCount < coupon.maxUses) {
            if (coupon.discountPercent > 0) {
              serverDiscount = Math.round(serverSubtotal * (coupon.discountPercent / 100));
            } else if (coupon.discountAmount > 0) {
              serverDiscount = Math.min(serverSubtotal, coupon.discountAmount);
            }
            // Incrementar uso del cupón
            await supabaseServer
              .from('Coupon')
              .update({ usedCount: coupon.usedCount + 1 })
              .eq('id', coupon.id);
          }
        }
      }
    }

    const serverTotal = Math.max(0, serverSubtotal - serverDiscount + serverDeliveryFee);

    // 5. Determinar Estado Inicial de la Orden y Pago
    let initialStatus = 'EN_COCINA';
    let initialPaymentStatus = 'PENDIENTE';

    if (paymentMethod === 'MERCADO_PAGO') {
      initialStatus = 'PENDIENTE_PAGO';
      initialPaymentStatus = 'PENDIENTE';
    } else if (paymentMethod === 'TRANSFERENCIA') {
      initialStatus = 'PENDIENTE_VERIFICACION';
      initialPaymentStatus = 'PENDIENTE';
    } else if (paymentMethod === 'EFECTIVO') {
      initialStatus = 'EN_COCINA';
      initialPaymentStatus = 'PENDIENTE';
    }

    // Cálculo de vuelto en efectivo
    const parsedCashPaid = Number(cashAmountPaid) || null;
    const cashChange = parsedCashPaid && parsedCashPaid > serverTotal ? parsedCashPaid - serverTotal : null;

    // 6. Gestionar Cliente (sin inflar totalSpent antes de entrega)
    let customerId = null;
    const { data: existingCustomer } = await supabaseServer
      .from('Customer')
      .select('id, ordersCount, deliveryAddress')
      .eq('phone', customerPhone.trim())
      .maybeSingle();

    if (existingCustomer) {
      customerId = existingCustomer.id;
      await supabaseServer
        .from('Customer')
        .update({
          name: customerName.trim(),
          deliveryAddress: deliveryAddress || existingCustomer.deliveryAddress,
          ordersCount: (existingCustomer.ordersCount || 0) + 1,
        })
        .eq('id', customerId);
    } else {
      const { data: newCustomer } = await supabaseServer
        .from('Customer')
        .insert({
          name: customerName.trim(),
          phone: customerPhone.trim(),
          deliveryAddress,
          ordersCount: 1,
          totalSpent: 0, // Se computa cuando el pedido se marca como ENTREGADO
        })
        .select('id')
        .single();

      if (newCustomer) {
        customerId = newCustomer.id;
      }
    }

    // 7. Insertar la Orden
    const { data: order, error: orderError } = await supabaseServer
      .from('Order')
      .insert({
        customerId,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        deliveryType,
        deliveryAddress: deliveryType === 'TAKE_AWAY' ? 'Retiro en Local (Alsina 350, Bahía Blanca)' : deliveryAddress,
        deliveryZoneId: deliveryType === 'DELIVERY' ? deliveryZoneId : null,
        deliveryFee: serverDeliveryFee,
        subtotal: serverSubtotal,
        discount: serverDiscount,
        total: serverTotal,
        status: initialStatus,
        paymentMethod,
        paymentStatus: initialPaymentStatus,
        paymentProofUrl: paymentProofUrl || null,
        notes,
        estimatedMinutes: deliveryType === 'TAKE_AWAY' ? 20 : 35,
        scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : null,
        cashAmountPaid: parsedCashPaid,
        cashChange,
      })
      .select()
      .single();

    if (orderError || !order) {
      throw orderError || new Error('No se pudo asentar la comanda en la base de datos');
    }

    // 8. Insertar Items asociados a la Orden
    const itemsToInsert = validatedOrderItems.map((item) => ({
      ...item,
      orderId: order.id,
    }));
    await supabaseServer.from('OrderItem').insert(itemsToInsert);

    // 9. Registrar en OrderStatusHistory
    await supabaseServer.from('OrderStatusHistory').insert({
      orderId: order.id,
      previousStatus: null,
      newStatus: initialStatus,
      changedBy: 'WEB_CHECKOUT',
      notes: `Comanda ingresada por cliente. Total recalculado: $${serverTotal}`,
    });

    // 10. Descontar Stock de Productos (Control de Existencias)
    for (const item of validatedOrderItems) {
      const product = productMap.get(item.productId);
      if (product) {
        const remainingStock = Math.max(0, (product.stock || 0) - item.quantity);
        await supabaseServer
          .from('Product')
          .update({
            stock: remainingStock,
            active: remainingStock > 0, // Auto-pausar si llega a 0
          })
          .eq('id', product.id);
      }
    }

    return NextResponse.json(
      {
        ...order,
        items: validatedOrderItems,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('Error creando orden:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
