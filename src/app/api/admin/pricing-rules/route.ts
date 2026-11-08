import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { logAudit } from '@/lib/audit';

export async function GET() {
  try {
    const { data: rules, error } = await supabaseServer
      .from('PricingRule')
      .select('*')
      .order('priority', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ rules: rules || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      active = true,
      priority = 10,
      stackable = false,
      kind,
      validFrom,
      validTo,
      daysOfWeek = [],
      startTime,
      endTime,
      minSubtotal,
      paymentMethods = [],
      deliveryTypes = [],
      productIds = [],
      categoryIds = [],
      segments = [],
      tiers = [],
      firstOrderOnly = false,
      percent,
      amount,
      buyQty,
      getQty,
      maxDiscount,
      maxUses,
    } = body;

    if (!name || !kind) {
      return NextResponse.json({ error: 'Nombre y tipo de regla son obligatorios' }, { status: 400 });
    }

    const id = `rule_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const { data: newRule, error } = await supabaseServer
      .from('PricingRule')
      .insert({
        id,
        name: name.trim(),
        active: Boolean(active),
        priority: Number(priority) || 10,
        stackable: Boolean(stackable),
        kind,
        validFrom: validFrom ? new Date(validFrom).toISOString() : null,
        validTo: validTo ? new Date(validTo).toISOString() : null,
        daysOfWeek: Array.isArray(daysOfWeek) ? daysOfWeek : [],
        startTime: startTime || null,
        endTime: endTime || null,
        minSubtotal: minSubtotal ? Number(minSubtotal) : null,
        paymentMethods: Array.isArray(paymentMethods) ? paymentMethods : [],
        deliveryTypes: Array.isArray(deliveryTypes) ? deliveryTypes : [],
        productIds: Array.isArray(productIds) ? productIds : [],
        categoryIds: Array.isArray(categoryIds) ? categoryIds : [],
        segments: Array.isArray(segments) ? segments : [],
        tiers: Array.isArray(tiers) ? tiers : [],
        firstOrderOnly: Boolean(firstOrderOnly),
        percent: percent !== undefined && percent !== null ? Number(percent) : null,
        amount: amount !== undefined && amount !== null ? Number(amount) : null,
        buyQty: buyQty ? Number(buyQty) : null,
        getQty: getQty ? Number(getQty) : null,
        maxDiscount: maxDiscount ? Number(maxDiscount) : null,
        maxUses: maxUses ? Number(maxUses) : null,
        usageCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAudit({
      action: 'PRICING_RULE_CREATE',
      entity: 'PricingRule',
      entityId: id,
      after: { name, kind, priority, percent, amount },
    });

    return NextResponse.json({ rule: newRule }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, active, ...rest } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID de regla requerido' }, { status: 400 });
    }

    const updatePayload: any = {
      updatedAt: new Date().toISOString(),
    };

    if (active !== undefined) updatePayload.active = Boolean(active);
    if (rest.name !== undefined) updatePayload.name = rest.name.trim();
    if (rest.priority !== undefined) updatePayload.priority = Number(rest.priority);
    if (rest.stackable !== undefined) updatePayload.stackable = Boolean(rest.stackable);
    if (rest.kind !== undefined) updatePayload.kind = rest.kind;
    if (rest.percent !== undefined) updatePayload.percent = Number(rest.percent);
    if (rest.amount !== undefined) updatePayload.amount = Number(rest.amount);
    if (rest.minSubtotal !== undefined) updatePayload.minSubtotal = Number(rest.minSubtotal);
    if (rest.startTime !== undefined) updatePayload.startTime = rest.startTime || null;
    if (rest.endTime !== undefined) updatePayload.endTime = rest.endTime || null;
    if (rest.daysOfWeek !== undefined) updatePayload.daysOfWeek = rest.daysOfWeek;
    if (rest.paymentMethods !== undefined) updatePayload.paymentMethods = rest.paymentMethods;
    if (rest.deliveryTypes !== undefined) updatePayload.deliveryTypes = rest.deliveryTypes;

    const { data: updated, error } = await supabaseServer
      .from('PricingRule')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAudit({
      action: 'PRICING_RULE_UPDATE',
      entity: 'PricingRule',
      entityId: id,
      after: updatePayload,
    });

    return NextResponse.json({ rule: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID de regla requerido' }, { status: 400 });
    }

    const { error } = await supabaseServer
      .from('PricingRule')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAudit({
      action: 'PRICING_RULE_DELETE',
      entity: 'PricingRule',
      entityId: id,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
