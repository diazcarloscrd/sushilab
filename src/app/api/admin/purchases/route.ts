import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { getAdminSession } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const [poRes, recRes, suppRes, historyRes] = await Promise.all([
      supabaseServer
        .from('PurchaseOrder')
        .select('*, supplier:Supplier(name, phone), lines:PurchaseOrderLine(*, ingredient:Ingredient(name, purchaseUnit))')
        .order('createdAt', { ascending: false })
        .limit(30),
      supabaseServer
        .from('PurchaseReceipt')
        .select('*, supplier:Supplier(name), lines:PurchaseReceiptLine(*, ingredient:Ingredient(name, baseUnit))')
        .order('receivedAt', { ascending: false })
        .limit(30),
      supabaseServer.from('Supplier').select('*').order('name', { ascending: true }),
      supabaseServer
        .from('IngredientPriceHistory')
        .select('*, ingredient:Ingredient(name), supplier:Supplier(name)')
        .order('createdAt', { ascending: false })
        .limit(20),
    ]);

    return NextResponse.json({
      purchaseOrders: poRes.data || [],
      receipts: recRes.data || [],
      suppliers: suppRes.data || [],
      priceHistory: historyRes.data || [],
    });
  } catch (err: any) {
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

    // 1. Crear Orden de Compra (Purchase Order)
    if (action === 'CREATE_PO') {
      const { supplierId, expectedAt, notes, lines = [] } = body;

      const totalEstimated = lines.reduce(
        (sum: number, l: any) => sum + (Number(l.qtyPurchaseUnits) || 0) * (Number(l.unitPriceEst) || 0),
        0
      );

      const { data: po, error: poErr } = await supabaseServer
        .from('PurchaseOrder')
        .insert({
          supplierId,
          expectedAt: expectedAt ? new Date(expectedAt).toISOString() : null,
          notes,
          totalEstimated,
          createdBy: `${session.name} (${session.role})`,
          status: 'SENT',
        })
        .select()
        .single();

      if (poErr || !po) throw poErr || new Error('No se pudo crear la Orden de Compra');

      const linesToInsert = lines.map((l: any) => ({
        purchaseOrderId: po.id,
        ingredientId: l.ingredientId,
        qtyPurchaseUnits: Number(l.qtyPurchaseUnits),
        unitPriceEst: Number(l.unitPriceEst),
      }));

      await supabaseServer.from('PurchaseOrderLine').insert(linesToInsert);

      await logAudit({
        userId: session.userId,
        userName: session.name,
        action: 'PURCHASE_ORDER_CREATE',
        entity: 'PurchaseOrder',
        entityId: po.id,
        after: { number: po.number, total: totalEstimated, linesCount: lines.length },
      });

      return NextResponse.json(po, { status: 201 });
    }

    // 2. Registrar Recepción de Mercadería (Purchase Receipt)
    if (action === 'RECEIVE') {
      const { supplierId, purchaseOrderId, invoiceNumber, paidFromCash, shiftId, lines = [] } = body;

      const total = lines.reduce(
        (sum: number, l: any) => sum + (Number(l.qtyPurchaseUnits) || 0) * (Number(l.unitPrice) || 0),
        0
      );

      const { data: receipt, error: recErr } = await supabaseServer
        .from('PurchaseReceipt')
        .insert({
          supplierId,
          purchaseOrderId: purchaseOrderId || null,
          invoiceNumber,
          total,
          paidFromCash: Boolean(paidFromCash),
          shiftId: shiftId || null,
          receivedBy: `${session.name} (${session.role})`,
        })
        .select()
        .single();

      if (recErr || !receipt) throw recErr || new Error('Error al asentar recepción');

      // Procesar cada línea de insumo
      for (const line of lines) {
        const { data: ing } = await supabaseServer
          .from('Ingredient')
          .select('*')
          .eq('id', line.ingredientId)
          .single();

        if (ing) {
          const factor = Number(ing.purchaseFactor) || 1;
          const qtyBase = Number(line.qtyPurchaseUnits) * factor;
          const unitPrice = Number(line.unitPrice);
          const newCostPerBaseUnit = unitPrice / factor;

          // Crear lote
          const batchCode = line.batchCode || `LOT-REC-${Date.now().toString().slice(-6)}`;
          const expiresAt = line.expiresAt
            ? new Date(line.expiresAt).toISOString()
            : ing.shelfLifeHours
            ? new Date(Date.now() + ing.shelfLifeHours * 60 * 60 * 1000).toISOString()
            : null;

          const { data: batch } = await supabaseServer
            .from('StockBatch')
            .insert({
              ingredientId: line.ingredientId,
              code: batchCode,
              qtyInitial: qtyBase,
              qtyRemaining: qtyBase,
              unitCost: newCostPerBaseUnit,
              expiresAt,
              sourceType: 'PURCHASE',
              sourceId: receipt.id,
            })
            .select()
            .single();

          // Registrar movimiento de compra (PURCHASE)
          await supabaseServer.from('StockMovement').insert({
            ingredientId: line.ingredientId,
            batchId: batch?.id || null,
            type: 'PURCHASE',
            qty: qtyBase,
            unitCost: newCostPerBaseUnit,
            refType: 'PurchaseReceipt',
            refId: receipt.id,
            reason: `Recepción factura #${invoiceNumber || receipt.number}`,
            userName: session.name,
          });

          // Historial de precios
          await supabaseServer.from('IngredientPriceHistory').insert({
            ingredientId: line.ingredientId,
            supplierId,
            unitPrice,
            costPerBaseUnit: newCostPerBaseUnit,
            receiptId: receipt.id,
          });

          // Actualizar costo base (D10: Último Precio de Compra) y sumar stock
          await supabaseServer
            .from('Ingredient')
            .update({
              stockQty: Number(ing.stockQty || 0) + qtyBase,
              costPerBaseUnit: newCostPerBaseUnit,
              updatedAt: new Date().toISOString(),
            })
            .eq('id', line.ingredientId);

          // Registrar línea del recibo
          await supabaseServer.from('PurchaseReceiptLine').insert({
            receiptId: receipt.id,
            ingredientId: line.ingredientId,
            qtyPurchaseUnits: Number(line.qtyPurchaseUnits),
            unitPrice,
            batchCode,
            expiresAt,
          });
        }
      }

      // Si estaba vinculada a una OC, actualizar estado
      if (purchaseOrderId) {
        await supabaseServer
          .from('PurchaseOrder')
          .update({ status: 'RECEIVED', updatedAt: new Date().toISOString() })
          .eq('id', purchaseOrderId);
      }

      await logAudit({
        userId: session.userId,
        userName: session.name,
        action: 'PURCHASE_RECEIPT',
        entity: 'PurchaseReceipt',
        entityId: receipt.id,
        after: { total, linesCount: lines.length, invoiceNumber },
      });

      return NextResponse.json(receipt, { status: 201 });
    }

    return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });
  } catch (err: any) {
    console.error('Error en compras:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
