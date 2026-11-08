import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    let query = supabase
      .from('Order')
      .select('*, items:OrderItem(*)')
      .order('createdAt', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data);
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
      deliveryType,
      deliveryAddress,
      deliveryZoneId,
      deliveryFee = 0,
      subtotal,
      discount = 0,
      total,
      paymentMethod = 'EFECTIVO',
      paymentProofUrl,
      notes = '',
      items = [],
    } = body;

    if (!customerName || !customerPhone || !items.length) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios para la comanda' },
        { status: 400 }
      );
    }

    // 1. Check or create customer
    let customerId = null;
    const { data: existingCustomer } = await supabase
      .from('Customer')
      .select('id, ordersCount, totalSpent, deliveryAddress')
      .eq('phone', customerPhone)
      .maybeSingle();

    if (existingCustomer) {
      customerId = existingCustomer.id;
      await supabase
        .from('Customer')
        .update({
          name: customerName,
          deliveryAddress: deliveryAddress || existingCustomer.deliveryAddress,
          ordersCount: (existingCustomer.ordersCount || 0) + 1,
          totalSpent: (existingCustomer.totalSpent || 0) + total,
        })
        .eq('id', customerId);
    } else {
      const { data: newCustomer } = await supabase
        .from('Customer')
        .insert({
          name: customerName,
          phone: customerPhone,
          deliveryAddress,
          ordersCount: 1,
          totalSpent: total,
        })
        .select()
        .single();

      if (newCustomer) {
        customerId = newCustomer.id;
      }
    }

    // 2. Insert Order
    const { data: order, error: orderError } = await supabase
      .from('Order')
      .insert({
        customerId,
        customerName,
        customerPhone,
        deliveryType,
        deliveryAddress,
        deliveryZoneId,
        deliveryFee,
        subtotal,
        discount,
        total,
        status: 'CREADO',
        paymentMethod,
        paymentStatus: paymentMethod === 'MERCADO_PAGO' ? 'APROBADO' : 'PENDIENTE',
        paymentProofUrl,
        notes,
        estimatedMinutes: deliveryType === 'TAKE_AWAY' ? 20 : 35,
      })
      .select()
      .single();

    if (orderError || !order) {
      throw orderError || new Error('No se pudo crear la comanda');
    }

    // 3. Insert OrderItems
    if (items.length > 0) {
      const orderItems = items.map((i: any) => ({
        orderId: order.id,
        productId: i.productId || null,
        name: i.name,
        price: i.price,
        quantity: i.quantity || 1,
        baseRice: i.baseRice || null,
        saucesJson: i.saucesJson || null,
        extrasJson: i.extrasJson || null,
        notes: i.notes || null,
      }));

      await supabase.from('OrderItem').insert(orderItems);
    }

    return NextResponse.json(order, { status: 201 });
  } catch (err: any) {
    console.error('Error creating order:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
