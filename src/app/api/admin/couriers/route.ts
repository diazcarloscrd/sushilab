import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { getAdminSession } from '@/lib/auth';
import { transitionOrder } from '@/lib/orders/transitionOrder';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const [couriersRes, tripsRes] = await Promise.all([
      supabaseServer.from('Courier').select('*').order('name', { ascending: true }),
      supabaseServer
        .from('DeliveryTrip')
        .select('*, courier:Courier(name, phone), orders:Order(id, orderNumber, total, deliveryAddress, status, paymentMethod, courierFee)')
        .order('departedAt', { ascending: false })
        .limit(20),
    ]);

    return NextResponse.json({
      couriers: couriersRes.data || [],
      trips: tripsRes.data || [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await req.json();
    const { action } = body;

    if (action === 'CREATE_COURIER') {
      const { name, phone, notes } = body;
      const { data: courier, error } = await supabaseServer
        .from('Courier')
        .insert({ name, phone, notes, active: true })
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json(courier, { status: 201 });
    }

    if (action === 'DISPATCH_TRIP') {
      const { courierId, orderIds = [], shiftId } = body;
      if (!courierId || orderIds.length === 0) {
        return NextResponse.json({ error: 'Cadete y comandas requeridas' }, { status: 400 });
      }

      // Crear salida (DeliveryTrip)
      const { data: trip, error: tripErr } = await supabaseServer
        .from('DeliveryTrip')
        .insert({
          courierId,
          shiftId: shiftId || null,
          status: 'OUT',
        })
        .select()
        .single();

      if (tripErr || !trip) throw tripErr || new Error('No se pudo registrar la salida del cadete');

      // Asignar y despachar cada orden
      const { data: courier } = await supabaseServer
        .from('Courier')
        .select('name')
        .eq('id', courierId)
        .single();

      for (const oId of orderIds) {
        await supabaseServer
          .from('Order')
          .update({
            courierId,
            tripId: trip.id,
            dispatchedAt: new Date().toISOString(),
          })
          .eq('id', oId);

        await transitionOrder(oId, 'EN_CAMINO', `${session.name} (${session.role})`, {
          notes: `Salida de reparto asignada a cadete: ${courier?.name || 'Cadete'}`,
        });
      }

      return NextResponse.json({ success: true, trip });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
