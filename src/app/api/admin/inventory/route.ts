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

    // 1. Insumos
    const { data: ingredients, error: ingErr } = await supabaseServer
      .from('Ingredient')
      .select('*, supplier:Supplier(id, name)')
      .order('name', { ascending: true });

    if (ingErr) throw ingErr;

    // 2. Lotes activos
    const { data: batches } = await supabaseServer
      .from('StockBatch')
      .select('*, ingredient:Ingredient(name, baseUnit)')
      .gt('qtyRemaining', 0)
      .order('expiresAt', { ascending: true });

    // 3. Movimientos recientes
    const { data: movements } = await supabaseServer
      .from('StockMovement')
      .select('*, ingredient:Ingredient(name, baseUnit)')
      .order('createdAt', { ascending: false })
      .limit(50);

    // 4. Proveedores
    const { data: suppliers } = await supabaseServer
      .from('Supplier')
      .select('*')
      .order('name', { ascending: true });

    // 5. Alertas de inventario
    const alerts: Array<{ type: string; title: string; message: string; severity: 'error' | 'warning' }> = [];
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    (ingredients || []).forEach((ing: any) => {
      if (ing.stockQty <= ing.minStock) {
        alerts.push({
          type: 'LOW_STOCK',
          title: `Stock Bajo: ${ing.name}`,
          message: `Stock actual: ${ing.stockQty} ${ing.baseUnit} (Mínimo: ${ing.minStock} ${ing.baseUnit})`,
          severity: ing.isCritical ? 'error' : 'warning',
        });
      }
    });

    (batches || []).forEach((batch: any) => {
      if (batch.expiresAt) {
        const expTime = new Date(batch.expiresAt).getTime();
        if (expTime < now) {
          alerts.push({
            type: 'BATCH_EXPIRED',
            title: `Lote Vencido: ${batch.ingredient?.name || batch.code}`,
            message: `El lote #${batch.code} venció el ${new Date(batch.expiresAt).toLocaleDateString('es-AR')}`,
            severity: 'error',
          });
        } else if (expTime - now <= oneDayMs) {
          alerts.push({
            type: 'BATCH_EXPIRING_SOON',
            title: `Lote por Vencer (< 24hs): ${batch.ingredient?.name || batch.code}`,
            message: `Quedan ${batch.qtyRemaining} ${batch.ingredient?.baseUnit} en lote #${batch.code}`,
            severity: 'warning',
          });
        }
      }
    });

    return NextResponse.json({
      ingredients: ingredients || [],
      batches: batches || [],
      movements: movements || [],
      suppliers: suppliers || [],
      alerts,
    });
  } catch (err: any) {
    console.error('Error fetching inventory:', err);
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

    // Producción de tanda (Shari, Limpieza de salmón)
    if (action === 'PRODUCE') {
      const { prepIngredientId, batchesCount = 1, actualOutputQty, notes } = body;

      const { data: prepIng } = await supabaseServer
        .from('Ingredient')
        .select('*')
        .eq('id', prepIngredientId)
        .single();

      if (!prepIng) return NextResponse.json({ error: 'Insumo de producción no encontrado' }, { status: 404 });

      const outputQty = Number(actualOutputQty) || (Number(prepIng.prepOutputQty) || 1000) * Number(batchesCount);

      // Crear lote de producción
      const batchCode = `PROD-${Date.now().toString().slice(-6)}`;
      const expiresAt = prepIng.shelfLifeHours
        ? new Date(Date.now() + prepIng.shelfLifeHours * 60 * 60 * 1000).toISOString()
        : null;

      const { data: newBatch, error: batchErr } = await supabaseServer
        .from('StockBatch')
        .insert({
          ingredientId: prepIngredientId,
          code: batchCode,
          qtyInitial: outputQty,
          qtyRemaining: outputQty,
          unitCost: prepIng.costPerBaseUnit || 0,
          expiresAt,
          sourceType: 'PRODUCTION',
        })
        .select()
        .single();

      if (batchErr) throw batchErr;

      // Registrar movimiento PRODUCTION_IN
      await supabaseServer.from('StockMovement').insert({
        ingredientId: prepIngredientId,
        batchId: newBatch.id,
        type: 'PRODUCTION_IN',
        qty: outputQty,
        unitCost: prepIng.costPerBaseUnit || 0,
        userName: `${session.name} (${session.role})`,
        reason: notes || `Producción de tanda (${batchesCount}x)`,
      });

      // Sumar al stock del ingrediente preparado
      await supabaseServer
        .from('Ingredient')
        .update({
          stockQty: (prepIng.stockQty || 0) + outputQty,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', prepIngredientId);

      await logAudit({
        userId: session.userId,
        userName: session.name,
        action: 'INVENTORY_PRODUCE',
        entity: 'StockBatch',
        entityId: newBatch.id,
        after: { ingredient: prepIng.name, qty: outputQty, batchCode },
      });

      return NextResponse.json({ success: true, batch: newBatch, outputQty });
    }

    // Registro de Merma manual (WASTE)
    if (action === 'WASTE') {
      const { ingredientId, qty, reason = 'Merma operativa de cocina', batchId } = body;
      const wasteQty = Math.abs(Number(qty));

      const { data: ing } = await supabaseServer
        .from('Ingredient')
        .select('*')
        .eq('id', ingredientId)
        .single();

      if (!ing) return NextResponse.json({ error: 'Insumo no encontrado' }, { status: 404 });

      if (batchId) {
        const { data: b } = await supabaseServer
          .from('StockBatch')
          .select('qtyRemaining')
          .eq('id', batchId)
          .single();
        if (b) {
          await supabaseServer
            .from('StockBatch')
            .update({ qtyRemaining: Math.max(0, (b.qtyRemaining || 0) - wasteQty) })
            .eq('id', batchId);
        }
      }

      await supabaseServer.from('StockMovement').insert({
        ingredientId,
        batchId: batchId || null,
        type: 'WASTE',
        qty: -wasteQty,
        unitCost: ing.costPerBaseUnit || 0,
        userName: `${session.name} (${session.role})`,
        reason,
      });

      await supabaseServer
        .from('Ingredient')
        .update({
          stockQty: Math.max(0, (ing.stockQty || 0) - wasteQty),
          updatedAt: new Date().toISOString(),
        })
        .eq('id', ingredientId);

      await logAudit({
        userId: session.userId,
        userName: session.name,
        action: 'INVENTORY_WASTE',
        entity: 'Ingredient',
        entityId: ingredientId,
        after: { ingredient: ing.name, wasteQty, reason },
      });

      return NextResponse.json({ success: true, wasted: wasteQty });
    }

    // Ajuste por Conteo Físico
    if (action === 'COUNT_ADJUST') {
      const { lines = [], notes } = body;
      // lines: [{ ingredientId, countedQty }]

      for (const line of lines) {
        const { data: ing } = await supabaseServer
          .from('Ingredient')
          .select('stockQty, costPerBaseUnit')
          .eq('id', line.ingredientId)
          .single();

        if (ing) {
          const currentStock = Number(ing.stockQty || 0);
          const counted = Number(line.countedQty);
          const diff = counted - currentStock;

          if (diff !== 0) {
            await supabaseServer.from('StockMovement').insert({
              ingredientId: line.ingredientId,
              type: 'ADJUSTMENT',
              qty: diff,
              unitCost: ing.costPerBaseUnit || 0,
              userName: `${session.name} (${session.role})`,
              reason: notes || `Ajuste por conteo físico semanal (Diff: ${diff})`,
            });

            await supabaseServer
              .from('Ingredient')
              .update({ stockQty: counted, updatedAt: new Date().toISOString() })
              .eq('id', line.ingredientId);
          }
        }
      }

      return NextResponse.json({ success: true, count: lines.length });
    }

    return NextResponse.json({ error: 'Acción no reconocida' }, { status: 400 });
  } catch (err: any) {
    console.error('Error en mutación de inventario:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
