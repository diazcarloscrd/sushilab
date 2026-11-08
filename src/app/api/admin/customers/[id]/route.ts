import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { getAdminSession } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { id } = await params;

    const { data: customer, error } = await supabaseServer
      .from('Customer')
      .select('*, orders:Order(id, orderNumber, total, status, paymentMethod, createdAt), notes:CustomerNote(*), loyaltyLedgers:LoyaltyLedger(*)')
      .eq('id', id)
      .single();

    if (error || !customer) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });

    return NextResponse.json(customer);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { name, allergies, tags, birthday, marketingConsent } = body;

    const updateData: any = { updatedAt: new Date().toISOString() };
    if (name) updateData.name = name;
    if (allergies !== undefined) updateData.allergies = allergies;
    if (tags) updateData.tags = tags;
    if (birthday !== undefined) updateData.birthday = birthday ? new Date(birthday).toISOString() : null;
    if (marketingConsent !== undefined) updateData.marketingConsent = marketingConsent;

    const { data: updated, error } = await supabaseServer
      .from('Customer')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await logAudit({
      userId: session.userId,
      userName: session.name,
      action: 'CUSTOMER_PROFILE_UPDATE',
      entity: 'Customer',
      entityId: id,
      after: updateData,
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { text } = body;

    if (!text?.trim()) {
      return NextResponse.json({ error: 'El contenido de la nota es requerido' }, { status: 400 });
    }

    const { data: note, error } = await supabaseServer
      .from('CustomerNote')
      .insert({
        customerId: id,
        text: text.trim(),
        userName: `${session.name} (${session.role})`,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(note, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
