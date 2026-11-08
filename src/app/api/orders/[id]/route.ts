import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { getAdminSession } from '@/lib/auth';

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
    const { status, paymentStatus, estimatedMinutes, notes } = body;

    // 1. Obtener la orden actual
    const { data: currentOrder, error: fetchErr } = await supabaseServer
      .from('Order')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !currentOrder) {
      return NextResponse.json({ error: 'Comanda no encontrada' }, { status: 404 });
    }

    const updateData: any = { updatedAt: new Date().toISOString() };
    let statusChanged = false;
    const previousStatus = currentOrder.status;

    if (status && status !== previousStatus) {
      // 2. Control de Transiciones Válidas de Estados
      const VALID_TRANSITIONS: Record<string, string[]> = {
        PENDIENTE_PAGO: ['EN_COCINA', 'CANCELADO'],
        PENDIENTE_VERIFICACION: ['EN_COCINA', 'CANCELADO'],
        CREADO: ['EN_COCINA', 'CANCELADO'],
        EN_COCINA: ['LISTO', 'CANCELADO'],
        LISTO: ['EN_CAMINO', 'ENTREGADO', 'CANCELADO'],
        EN_CAMINO: ['ENTREGADO', 'CANCELADO'],
        ENTREGADO: ['CANCELADO'], // Solo en caso extraordinario
        CANCELADO: [],
      };

      const allowedNext = VALID_TRANSITIONS[previousStatus] || [];
      const isSuperadmin = session.role === 'SUPERADMIN';

      if (!allowedNext.includes(status) && !isSuperadmin) {
        return NextResponse.json(
          {
            error: `Transición de estado inválida: no se puede pasar de "${previousStatus}" a "${status}".`,
          },
          { status: 400 }
        );
      }

      updateData.status = status;
      statusChanged = true;
    }

    if (paymentStatus) {
      updateData.paymentStatus = paymentStatus;
    }

    if (estimatedMinutes !== undefined) {
      updateData.estimatedMinutes = Number(estimatedMinutes);
    }

    // 3. Ejecutar actualización
    const { data: updatedOrder, error: updateErr } = await supabaseServer
      .from('Order')
      .update(updateData)
      .eq('id', id)
      .select('*, items:OrderItem(*)')
      .single();

    if (updateErr) throw updateErr;

    // 4. Asentar en OrderStatusHistory si hubo cambio de estado
    if (statusChanged) {
      await supabaseServer.from('OrderStatusHistory').insert({
        orderId: id,
        previousStatus,
        newStatus: status,
        changedBy: `${session.name} (${session.role})`,
        notes: notes || `Cambio de estado en panel de control`,
      });

      // 5. Si pasa a ENTREGADO, computar el gasto histórico del cliente (Lógica de fidelidad real)
      if (status === 'ENTREGADO' && updatedOrder.customerId) {
        const { data: customer } = await supabaseServer
          .from('Customer')
          .select('id, totalSpent')
          .eq('id', updatedOrder.customerId)
          .maybeSingle();

        if (customer) {
          const newSpent = (customer.totalSpent || 0) + (updatedOrder.total || 0);
          await supabaseServer
            .from('Customer')
            .update({ totalSpent: newSpent })
            .eq('id', customer.id);
        }
      }
    }

    return NextResponse.json(updatedOrder);
  } catch (err: any) {
    console.error('Error updating order:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
