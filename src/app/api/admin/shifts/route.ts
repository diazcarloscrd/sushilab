import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { getAdminSession } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 1. Obtener turno abierto si existe
    const { data: openShift } = await supabaseServer
      .from('CashShift')
      .select('*')
      .eq('status', 'OPEN')
      .maybeSingle();

    let currentShiftData: any = null;

    if (openShift) {
      // Obtener movimientos del turno
      const { data: movements } = await supabaseServer
        .from('CashMovement')
        .select('*')
        .eq('shiftId', openShift.id)
        .order('createdAt', { ascending: false });

      // Obtener comandas asociadas al turno
      const { data: shiftOrders } = await supabaseServer
        .from('Order')
        .select('id, orderNumber, total, subtotal, deliveryFee, discount, status, paymentMethod, paymentStatus, deliveryType, cashCollectedBy, courierFee')
        .eq('shiftId', openShift.id);

      const orders = shiftOrders || [];
      const validOrders = orders.filter((o) => o.status !== 'CANCELADO');

      // Ventas por medio de pago
      const mpTotal = validOrders
        .filter((o) => o.paymentMethod === 'MERCADO_PAGO' && o.paymentStatus === 'APROBADO')
        .reduce((sum, o) => sum + (o.total || 0), 0);

      const transTotal = validOrders
        .filter((o) => o.paymentMethod === 'TRANSFERENCIA' && o.paymentStatus === 'APROBADO')
        .reduce((sum, o) => sum + (o.total || 0), 0);

      const cashLocal = validOrders
        .filter((o) => o.paymentMethod === 'EFECTIVO' && o.status === 'ENTREGADO' && o.cashCollectedBy === 'LOCAL')
        .reduce((sum, o) => sum + (o.total || 0), 0);

      // Movimientos de caja
      const movs = movements || [];
      const courierSettlements = movs
        .filter((m) => m.type === 'COURIER_SETTLEMENT')
        .reduce((sum, m) => sum + (m.amount || 0), 0);

      const cashExpenses = movs
        .filter((m) => ['EXPENSE', 'WITHDRAWAL', 'PURCHASE_PAYMENT'].includes(m.type) && m.method === 'EFECTIVO')
        .reduce((sum, m) => sum + (m.amount || 0), 0);

      const cashIncomes = movs
        .filter((m) => m.type === 'INCOME' && m.method === 'EFECTIVO')
        .reduce((sum, m) => sum + (m.amount || 0), 0);

      const openingFloat = Number(openShift.openingFloat) || 0;
      const expectedCash = openingFloat + cashLocal + courierSettlements + cashIncomes - cashExpenses;

      currentShiftData = {
        ...openShift,
        movements: movs,
        ordersCount: validOrders.length,
        deliveredCount: validOrders.filter((o) => o.status === 'ENTREGADO').length,
        mpTotal,
        transTotal,
        cashLocal,
        courierSettlements,
        cashExpenses,
        expectedCash,
      };
    }

    // 2. Historial de los últimos 15 turnos cerrados
    const { data: pastShifts } = await supabaseServer
      .from('CashShift')
      .select('*')
      .eq('status', 'CLOSED')
      .order('closedAt', { ascending: false })
      .limit(15);

    // 3. Cadetes activos
    const { data: couriers } = await supabaseServer
      .from('Courier')
      .select('*')
      .eq('active', true)
      .order('name', { ascending: true });

    return NextResponse.json({
      currentShift: currentShiftData,
      pastShifts: pastShifts || [],
      couriers: couriers || [],
    });
  } catch (err: any) {
    console.error('Error fetching cash shifts:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    // ABRIR TURNO
    if (action === 'OPEN_SHIFT') {
      const { openingFloat = 0, notes = '' } = body;

      // Verificar que no haya un turno ya abierto
      const { data: existing } = await supabaseServer
        .from('CashShift')
        .select('id')
        .eq('status', 'OPEN')
        .maybeSingle();

      if (existing) {
        return NextResponse.json({ error: 'Ya existe un turno de caja abierto actualmente' }, { status: 400 });
      }

      const { data: shift, error: shiftErr } = await supabaseServer
        .from('CashShift')
        .insert({
          status: 'OPEN',
          openedBy: `${session.name} (${session.role})`,
          openingFloat: Number(openingFloat) || 0,
          notes,
        })
        .select()
        .single();

      if (shiftErr || !shift) throw shiftErr || new Error('No se pudo abrir el turno');

      // Actualizar StoreSetting STORE_IS_OPEN a true
      await supabaseServer
        .from('StoreSetting')
        .upsert({ key: 'STORE_IS_OPEN', value: 'true', updatedAt: new Date().toISOString() });

      await logAudit({
        userId: session.userId,
        userName: session.name,
        action: 'CASH_SHIFT_OPEN',
        entity: 'CashShift',
        entityId: shift.id,
        after: { number: shift.number, openingFloat },
      });

      return NextResponse.json(shift, { status: 201 });
    }

    // CERRAR TURNO
    if (action === 'CLOSE_SHIFT') {
      const { shiftId, countedCash, cashBreakdown, notes } = body;

      const { data: shift } = await supabaseServer
        .from('CashShift')
        .select('*')
        .eq('id', shiftId)
        .eq('status', 'OPEN')
        .single();

      if (!shift) return NextResponse.json({ error: 'Turno no encontrado o ya cerrado' }, { status: 404 });

      // Calcular montos finales
      const { data: orders } = await supabaseServer
        .from('Order')
        .select('total, status, paymentMethod, paymentStatus, cashCollectedBy')
        .eq('shiftId', shiftId);

      const { data: movements } = await supabaseServer
        .from('CashMovement')
        .select('*')
        .eq('shiftId', shiftId);

      const validOrders = (orders || []).filter((o) => o.status !== 'CANCELADO');
      const cashLocal = validOrders
        .filter((o) => o.paymentMethod === 'EFECTIVO' && o.status === 'ENTREGADO' && o.cashCollectedBy === 'LOCAL')
        .reduce((sum, o) => sum + (o.total || 0), 0);

      const movs = movements || [];
      const courierSettlements = movs
        .filter((m) => m.type === 'COURIER_SETTLEMENT')
        .reduce((sum, m) => sum + (m.amount || 0), 0);

      const cashExpenses = movs
        .filter((m) => ['EXPENSE', 'WITHDRAWAL', 'PURCHASE_PAYMENT'].includes(m.type) && m.method === 'EFECTIVO')
        .reduce((sum, m) => sum + (m.amount || 0), 0);

      const cashIncomes = movs
        .filter((m) => m.type === 'INCOME' && m.method === 'EFECTIVO')
        .reduce((sum, m) => sum + (m.amount || 0), 0);

      const openingFloat = Number(shift.openingFloat) || 0;
      const expectedCash = openingFloat + cashLocal + courierSettlements + cashIncomes - cashExpenses;
      const parsedCounted = Number(countedCash) || 0;
      const difference = parsedCounted - expectedCash;

      const summary = {
        openingFloat,
        cashLocal,
        courierSettlements,
        cashIncomes,
        cashExpenses,
        expectedCash,
        countedCash: parsedCounted,
        difference,
        ordersCount: validOrders.length,
      };

      const { data: closedShift, error: closeErr } = await supabaseServer
        .from('CashShift')
        .update({
          status: 'CLOSED',
          closedAt: new Date().toISOString(),
          closedBy: `${session.name} (${session.role})`,
          expectedCash,
          countedCash: parsedCounted,
          difference,
          cashBreakdown: cashBreakdown ? JSON.stringify(cashBreakdown) : null,
          summary: JSON.stringify(summary),
          notes,
        })
        .eq('id', shiftId)
        .select()
        .single();

      if (closeErr) throw closeErr;

      // Actualizar StoreSetting STORE_IS_OPEN a false
      await supabaseServer
        .from('StoreSetting')
        .upsert({ key: 'STORE_IS_OPEN', value: 'false', updatedAt: new Date().toISOString() });

      await logAudit({
        userId: session.userId,
        userName: session.name,
        action: 'CASH_SHIFT_CLOSE',
        entity: 'CashShift',
        entityId: shiftId,
        after: summary,
      });

      return NextResponse.json(closedShift);
    }

    // REGISTRAR MOVIMIENTO (Gasto, Ingreso, Retiro, Rendición de Cadete)
    if (action === 'ADD_MOVEMENT') {
      const { shiftId, type, amount, method = 'EFECTIVO', category = 'Otros', reason, courierId } = body;

      if (!shiftId || !amount || !reason) {
        return NextResponse.json({ error: 'Faltan campos requeridos para el movimiento de caja' }, { status: 400 });
      }

      const { data: mov, error: movErr } = await supabaseServer
        .from('CashMovement')
        .insert({
          shiftId,
          type,
          amount: Math.abs(Number(amount)),
          method,
          category,
          reason,
          courierId: courierId || null,
          userName: `${session.name} (${session.role})`,
        })
        .select()
        .single();

      if (movErr) throw movErr;

      return NextResponse.json(mov, { status: 201 });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (err: any) {
    console.error('Error en operación de caja:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
