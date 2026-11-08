import { supabaseServer } from '@/lib/supabaseServer';
import { canTransition } from '@/lib/orders/transitions';
import { logAudit } from '@/lib/audit';
import { consumeOrderStock, revertOrderStock } from '@/lib/inventory/stockService';
import { calculatePointsEarned, EXPIRY_MONTHS } from '@/lib/loyalty/engine';

export interface TransitionOrderOptions {
  notes?: string | null;
  paymentStatus?: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
  mpPaymentId?: string;
  cancelMode?: 'WASTE' | 'RETURN'; // Si el pedido ya consumió insumos en cocina
  actorSession?: {
    userId?: string;
    name?: string;
    role?: string;
  } | null;
  ip?: string | null;
}

export async function transitionOrder(
  orderId: string,
  targetStatus: string,
  actorName: string,
  options: TransitionOrderOptions = {}
) {
  // 1. Obtener la comanda actual
  const { data: order, error: fetchErr } = await supabaseServer
    .from('Order')
    .select('*, items:OrderItem(*)')
    .eq('id', orderId)
    .single();

  if (fetchErr || !order) {
    throw new Error(`Comanda #${orderId} no encontrada`);
  }

  const previousStatus = order.status;

  // Idempotencia: si ya está en el estado deseado
  if (previousStatus === targetStatus) {
    if (options.paymentStatus && options.paymentStatus !== order.paymentStatus) {
      await supabaseServer
        .from('Order')
        .update({ paymentStatus: options.paymentStatus, updatedAt: new Date().toISOString() })
        .eq('id', orderId);
    }
    return order;
  }

  // 2. Validar transición de estado
  const actorRole = options.actorSession?.role || 'SYSTEM';
  const allowed = canTransition(previousStatus, targetStatus, actorRole);
  if (!allowed) {
    throw new Error(
      `Transición no permitida: no se puede pasar de "${previousStatus}" a "${targetStatus}" con rol ${actorRole}.`
    );
  }

  const updatePayload: any = {
    status: targetStatus,
    updatedAt: new Date().toISOString(),
  };

  if (options.paymentStatus) {
    updatePayload.paymentStatus = options.paymentStatus;
  }
  if (options.mpPaymentId) {
    updatePayload.mpPaymentId = options.mpPaymentId;
  }

  // Timestamps operativos
  if (targetStatus === 'EN_CAMINO' && !order.dispatchedAt) {
    updatePayload.dispatchedAt = new Date().toISOString();
  }
  if (targetStatus === 'ENTREGADO' && !order.deliveredAt) {
    updatePayload.deliveredAt = new Date().toISOString();
  }

  // 3. Ejecutar actualización de la orden
  const { data: updatedOrder, error: updateErr } = await supabaseServer
    .from('Order')
    .update(updatePayload)
    .eq('id', orderId)
    .select('*, items:OrderItem(*)')
    .single();

  if (updateErr || !updatedOrder) {
    throw new Error(`Error actualizando comanda #${orderId}: ${updateErr?.message}`);
  }

  // 4. Asentar en historial de estados
  await supabaseServer.from('OrderStatusHistory').insert({
    orderId,
    previousStatus,
    newStatus: targetStatus,
    changedBy: actorName,
    notes: options.notes || `Transición automática a ${targetStatus}`,
    createdAt: new Date().toISOString(),
  });

  // 4.1 Consumo automático de insumos al entrar a Cocina KDS (Fase 1)
  if (targetStatus === 'EN_COCINA') {
    try {
      await consumeOrderStock(orderId);
    } catch (stockErr) {
      console.error(`Error consumiendo stock en comanda #${orderId}:`, stockErr);
    }
  }

  // 4.2 Reversión de insumos o registro de merma si se cancela un pedido con stock consumido (Fase 1)
  if (targetStatus === 'CANCELADO' && order.stockConsumedAt) {
    try {
      await revertOrderStock(orderId, options.cancelMode || 'RETURN', actorName);
    } catch (stockRevErr) {
      console.error(`Error revirtiendo stock en comanda #${orderId}:`, stockRevErr);
    }
  }

  // 5. Efectos al pasar a ENTREGADO: acumular pedidos, gasto real y puntos de fidelidad
  if (targetStatus === 'ENTREGADO' && updatedOrder.customerId) {
    const { data: customer } = await supabaseServer
      .from('Customer')
      .select('id, ordersCount, totalSpent, tier, pointsBalance')
      .eq('id', updatedOrder.customerId)
      .maybeSingle();

    if (customer) {
      const newCount = (customer.ordersCount || 0) + 1;
      const newSpent = (customer.totalSpent || 0) + (updatedOrder.total || 0);

      // Calcular puntos ganados (subtotal neto de descuentos)
      const netSubtotal = Math.max(0, (updatedOrder.subtotal || 0) - (updatedOrder.discount || 0));
      const pointsEarned = calculatePointsEarned(netSubtotal, customer.tier || 'BRONCE');

      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + EXPIRY_MONTHS);

      // Registrar EARN en el libro de fidelidad
      if (pointsEarned > 0) {
        await supabaseServer.from('LoyaltyLedger').insert({
          id: `lead_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          customerId: customer.id,
          orderId: updatedOrder.id,
          type: 'EARN',
          points: pointsEarned,
          remaining: pointsEarned,
          expiresAt: expiresAt.toISOString(),
          note: `Puntos ganados por comanda #${updatedOrder.id}`,
          createdAt: new Date().toISOString(),
        });

        await supabaseServer
          .from('Order')
          .update({ pointsEarned })
          .eq('id', updatedOrder.id);
      }

      const updatedPointsBalance = (customer.pointsBalance || 0) + pointsEarned;

      await supabaseServer
        .from('Customer')
        .update({
          ordersCount: newCount,
          totalSpent: newSpent,
          pointsBalance: updatedPointsBalance,
          lastOrderAt: new Date().toISOString(),
        })
        .eq('id', customer.id);
    }
  }

  // 6. Efecto al cancelar un pedido que ya tenía puntos ganados o canjeados
  if (targetStatus === 'CANCELADO' && updatedOrder.customerId) {
    const { data: customer } = await supabaseServer
      .from('Customer')
      .select('id, ordersCount, totalSpent, pointsBalance')
      .eq('id', updatedOrder.customerId)
      .maybeSingle();

    if (customer) {
      let balanceDelta = 0;

      // Si había ganado puntos y se cancela, se revierten los ganados
      if (order.pointsEarned && order.pointsEarned > 0) {
        balanceDelta -= order.pointsEarned;
        await supabaseServer.from('LoyaltyLedger').insert({
          id: `rev_earn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          customerId: customer.id,
          orderId: order.id,
          type: 'REVERSAL',
          points: -order.pointsEarned,
          remaining: 0,
          note: `Reversión de puntos ganados por cancelación de comanda #${order.id}`,
          createdAt: new Date().toISOString(),
        });
      }

      // Si había canjeado puntos y se cancela, se devuelven los canjeados
      if (order.pointsRedeemed && order.pointsRedeemed > 0) {
        balanceDelta += order.pointsRedeemed;
        await supabaseServer.from('LoyaltyLedger').insert({
          id: `rev_red_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          customerId: customer.id,
          orderId: order.id,
          type: 'REVERSAL',
          points: order.pointsRedeemed,
          remaining: order.pointsRedeemed,
          note: `Devolución de puntos canjeados por comanda cancelada #${order.id}`,
          createdAt: new Date().toISOString(),
        });
      }

      const updateData: any = {};
      if (balanceDelta !== 0) {
        updateData.pointsBalance = (customer.pointsBalance || 0) + balanceDelta;
      }

      if (previousStatus === 'ENTREGADO') {
        updateData.ordersCount = Math.max(0, (customer.ordersCount || 0) - 1);
        updateData.totalSpent = Math.max(0, (customer.totalSpent || 0) - (updatedOrder.total || 0));
      }

      if (Object.keys(updateData).length > 0) {
        await supabaseServer
          .from('Customer')
          .update(updateData)
          .eq('id', customer.id);
      }
    }
  }

  // 7. Auditoría
  await logAudit({
    userId: options.actorSession?.userId,
    userName: actorName,
    action: 'ORDER_STATUS_TRANSITION',
    entity: 'Order',
    entityId: orderId,
    before: { status: previousStatus, paymentStatus: order.paymentStatus },
    after: { status: targetStatus, paymentStatus: updatedOrder.paymentStatus },
    ip: options.ip,
  });

  return updatedOrder;
}
