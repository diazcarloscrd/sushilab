import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { getAdminSession } from '@/lib/auth';
import { transitionOrder } from '@/lib/orders/transitionOrder';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: order, error } = await supabaseServer
      .from('Order')
      .select('*, items:OrderItem(*), deliveryZone:DeliveryZone(*), statusHistory:OrderStatusHistory(*)')
      .eq('id', id)
      .maybeSingle();

    if (error || !order) {
      return NextResponse.json({ error: 'Comanda no encontrada' }, { status: 404 });
    }

    return NextResponse.json(order);
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
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado. Se requiere sesión activa de personal.' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { status, paymentStatus, estimatedMinutes, notes, cancelMode } = body;
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';

    let updatedOrder: any = null;

    if (status) {
      updatedOrder = await transitionOrder(id, status, `${session.name} (${session.role})`, {
        notes,
        paymentStatus,
        cancelMode,
        actorSession: session,
        ip,
      });
    }

    // Si además se actualizaron minutos o notas sin cambio de estado
    if (estimatedMinutes !== undefined || (!status && (paymentStatus || notes))) {
      const extraUpdates: any = { updatedAt: new Date().toISOString() };
      if (estimatedMinutes !== undefined) extraUpdates.estimatedMinutes = Number(estimatedMinutes);
      if (paymentStatus && !status) extraUpdates.paymentStatus = paymentStatus;
      if (notes && !status) extraUpdates.notes = notes;

      const { data: directUpdated, error: directErr } = await supabaseServer
        .from('Order')
        .update(extraUpdates)
        .eq('id', id)
        .select('*, items:OrderItem(*)')
        .single();

      if (directErr) throw directErr;
      updatedOrder = directUpdated;
    }

    return NextResponse.json(updatedOrder);
  } catch (err: any) {
    console.error('Error updating order:', err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
