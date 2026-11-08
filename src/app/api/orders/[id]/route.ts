import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    let query = supabase
      .from('Order')
      .select('*, items:OrderItem(*), deliveryZone:DeliveryZone(*)')
      .order('createdAt', { ascending: false });

    // Handle special keyword 'ultimo' to get the latest order
    if (id === 'ultimo') {
      const { data, error } = await query.limit(1).maybeSingle();
      if (error) throw error;
      return NextResponse.json(data);
    }

    const { data, error } = await query.eq('id', id).single();
    if (error) throw error;

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Error fetching order by id:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, paymentStatus, estimatedMinutes } = body;

    const updateData: any = {};
    if (status) updateData.status = status;
    if (paymentStatus) updateData.paymentStatus = paymentStatus;
    if (estimatedMinutes !== undefined) updateData.estimatedMinutes = estimatedMinutes;

    const { data: updatedOrder, error } = await supabase
      .from('Order')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    const { data: items } = await supabase
      .from('OrderItem')
      .select('*')
      .eq('orderId', id);

    return NextResponse.json({ ...updatedOrder, items: items || [] });
  } catch (err: any) {
    console.error('Error updating order:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
