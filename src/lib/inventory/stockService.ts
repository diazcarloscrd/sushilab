import { supabaseServer } from '@/lib/supabaseServer';
import { allocateBatchesFEFO, BatchItem } from './engine';
import { logAudit } from '@/lib/audit';

export async function consumeOrderStock(orderId: string): Promise<boolean> {
  // 1. Obtener orden con sus items
  const { data: order, error: orderErr } = await supabaseServer
    .from('Order')
    .select('*, items:OrderItem(*)')
    .eq('id', orderId)
    .single();

  if (orderErr || !order) return false;

  // Idempotente: si ya se consumió, no duplicar
  if (order.stockConsumedAt) return true;

  const orderItems = order.items || [];
  if (orderItems.length === 0) return true;

  const productIds = orderItems.map((i: any) => i.productId).filter(Boolean);

  // 2. Obtener recetas de los productos y extras
  const { data: recipeLines } = await supabaseServer
    .from('RecipeLine')
    .select('*, ingredient:Ingredient(*)')
    .in('productId', productIds);

  const lines = recipeLines || [];
  if (lines.length === 0) {
    // Si los productos no tienen escandallo, marcar consumido
    await supabaseServer
      .from('Order')
      .update({ stockConsumedAt: new Date().toISOString() })
      .eq('id', orderId);
    return true;
  }

  // Agrupar cantidades totales necesarias por ingrediente
  const neededPerIngredient = new Map<string, { qty: number; ingredient: any }>();

  for (const item of orderItems) {
    const itemQty = Number(item.quantity) || 1;
    const itemLines = lines.filter((l: any) => l.productId === item.productId);

    for (const rLine of itemLines) {
      const ingId = rLine.ingredientId;
      const totalLineQty = Number(rLine.quantity) * itemQty;
      const current = neededPerIngredient.get(ingId);
      if (current) {
        current.qty += totalLineQty;
      } else {
        neededPerIngredient.set(ingId, {
          qty: totalLineQty,
          ingredient: rLine.ingredient,
        });
      }
    }
  }

  // 3. Descontar stock y registrar movimientos por ingrediente
  const touchedIngredientIds: string[] = [];

  for (const [ingId, req] of neededPerIngredient.entries()) {
    touchedIngredientIds.push(ingId);
    const ing = req.ingredient;
    const neededQty = req.qty;

    if (ing.tracksBatches) {
      // FEFO sobre lotes activos
      const { data: batchesRaw } = await supabaseServer
        .from('StockBatch')
        .select('*')
        .eq('ingredientId', ingId)
        .gt('qtyRemaining', 0);

      const batches: BatchItem[] = (batchesRaw || []).map((b: any) => ({
        id: b.id,
        ingredientId: b.ingredientId,
        code: b.code,
        qtyRemaining: Number(b.qtyRemaining),
        unitCost: Number(b.unitCost),
        receivedAt: b.receivedAt,
        expiresAt: b.expiresAt,
      }));

      const { allocations } = allocateBatchesFEFO(batches, neededQty);

      for (const alloc of allocations) {
        // Descontar del lote
        const b = batches.find((x) => x.id === alloc.batchId);
        const newRem = Math.max(0, (b?.qtyRemaining || 0) - alloc.qty);
        await supabaseServer
          .from('StockBatch')
          .update({ qtyRemaining: newRem })
          .eq('id', alloc.batchId);

        // Movimiento SALE vinculado al lote
        await supabaseServer.from('StockMovement').insert({
          ingredientId: ingId,
          batchId: alloc.batchId,
          type: 'SALE',
          qty: -alloc.qty,
          unitCost: b?.unitCost || ing.costPerBaseUnit,
          orderId,
          reason: `Comanda #${order.orderNumber}`,
          createdAt: new Date().toISOString(),
        });
      }
    } else {
      // Movimiento general sin lote
      await supabaseServer.from('StockMovement').insert({
        ingredientId: ingId,
        type: 'SALE',
        qty: -neededQty,
        unitCost: ing.costPerBaseUnit || 0,
        orderId,
        reason: `Comanda #${order.orderNumber}`,
        createdAt: new Date().toISOString(),
      });
    }

    // Actualizar stockQty en Ingredient
    const newStock = Math.max(0, (ing.stockQty || 0) - neededQty);
    await supabaseServer
      .from('Ingredient')
      .update({ stockQty: newStock, updatedAt: new Date().toISOString() })
      .eq('id', ingId);
  }

  // 4. Marcar orden como stock consumido
  await supabaseServer
    .from('Order')
    .update({ stockConsumedAt: new Date().toISOString() })
    .eq('id', orderId);

  // 5. Refrescar disponibilidad de los productos afectados
  await refreshProductsAvailability(touchedIngredientIds);

  return true;
}

export async function revertOrderStock(
  orderId: string,
  mode: 'RETURN' | 'WASTE' = 'RETURN',
  userName?: string
) {
  const { data: movements } = await supabaseServer
    .from('StockMovement')
    .select('*, ingredient:Ingredient(*)')
    .eq('orderId', orderId)
    .eq('type', 'SALE');

  if (!movements || movements.length === 0) return;

  const touchedIngredientIds: string[] = [];

  for (const mov of movements) {
    const qtyToRevert = Math.abs(Number(mov.qty));
    touchedIngredientIds.push(mov.ingredientId);

    if (mode === 'RETURN') {
      // Revertir a lote original si existía
      if (mov.batchId) {
        const { data: batch } = await supabaseServer
          .from('StockBatch')
          .select('qtyRemaining')
          .eq('id', mov.batchId)
          .single();

        if (batch) {
          await supabaseServer
            .from('StockBatch')
            .update({ qtyRemaining: Number(batch.qtyRemaining) + qtyToRevert })
            .eq('id', mov.batchId);
        }
      }

      // Movimiento SALE_REVERSAL
      await supabaseServer.from('StockMovement').insert({
        ingredientId: mov.ingredientId,
        batchId: mov.batchId,
        type: 'SALE_REVERSAL',
        qty: qtyToRevert,
        unitCost: mov.unitCost,
        orderId,
        reason: `Cancelación comanda #${orderId} (Devolución a stock)`,
        userName,
        createdAt: new Date().toISOString(),
      });

      // Sumar al stock del ingrediente
      const { data: ing } = await supabaseServer
        .from('Ingredient')
        .select('stockQty')
        .eq('id', mov.ingredientId)
        .single();

      if (ing) {
        await supabaseServer
          .from('Ingredient')
          .update({ stockQty: Number(ing.stockQty) + qtyToRevert })
          .eq('id', mov.ingredientId);
      }
    } else {
      // Registrar merma (WASTE) sin devolver al stock físico
      await supabaseServer.from('StockMovement').insert({
        ingredientId: mov.ingredientId,
        batchId: mov.batchId,
        type: 'WASTE',
        qty: -qtyToRevert,
        unitCost: mov.unitCost,
        orderId,
        reason: `Cancelación comanda #${orderId} (Desperdicio / Merma de cocina)`,
        userName,
        createdAt: new Date().toISOString(),
      });
    }
  }

  await refreshProductsAvailability(touchedIngredientIds);
}

export async function refreshProductsAvailability(ingredientIds: string[]) {
  if (ingredientIds.length === 0) return;

  // Obtener productos que usan estos ingredientes
  const { data: recipeLines } = await supabaseServer
    .from('RecipeLine')
    .select('productId, quantity, ingredient:Ingredient(stockQty, isCritical)')
    .in('ingredientId', ingredientIds)
    .not('productId', 'is', null);

  const productMap = new Map<string, any[]>();
  (recipeLines || []).forEach((rl: any) => {
    if (!productMap.has(rl.productId)) productMap.set(rl.productId, []);
    productMap.get(rl.productId)!.push(rl);
  });

  for (const [prodId, lines] of productMap.entries()) {
    let minPortions = Infinity;
    let hasCriticalShortage = false;

    for (const l of lines) {
      const stock = Number(l.ingredient?.stockQty || 0);
      const isCritical = Boolean(l.ingredient?.isCritical);
      const portions = Math.floor(stock / (Number(l.quantity) || 1));

      if (isCritical && stock <= 0) {
        hasCriticalShortage = true;
      }
      if (portions < minPortions) {
        minPortions = portions;
      }
    }

    const availablePortions = minPortions === Infinity ? 50 : Math.max(0, minPortions);
    const autoPaused = hasCriticalShortage || availablePortions === 0;

    await supabaseServer
      .from('Product')
      .update({
        availablePortions,
        autoPaused,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', prodId);
  }
}
