export interface IngredientStockItem {
  id: string;
  name: string;
  kind: 'RAW' | 'PREP' | 'PACKAGING';
  baseUnit: 'G' | 'ML' | 'UNIT';
  costPerBaseUnit: number;
  stockQty: number;
  minStock: number;
  tracksBatches: boolean;
  isCritical: boolean;
  prepOutputQty?: number | null;
  prepYieldPct?: number | null;
}

export interface RecipeLineItem {
  id: string;
  ingredientId: string;
  productId?: string | null;
  modifierOptionId?: string | null;
  prepIngredientId?: string | null;
  quantity: number;
}

export interface BatchItem {
  id: string;
  ingredientId: string;
  code: string;
  qtyRemaining: number;
  unitCost: number;
  receivedAt: string | Date;
  expiresAt?: string | Date | null;
}

/**
 * Cálculo del costo unitario base de un ingrediente.
 * Si es RAW/PACKAGING -> costPerBaseUnit directo.
 * Si es PREP -> suma de costos de sus insumos / rendimiento (prepOutputQty) o ajustado por yield %.
 */
export function calculateIngredientUnitCost(
  ingredient: IngredientStockItem,
  subLines: RecipeLineItem[] = [],
  allIngredientsMap: Map<string, IngredientStockItem> = new Map()
): number {
  if (ingredient.kind !== 'PREP') {
    return ingredient.costPerBaseUnit || 0;
  }

  // Si tiene rendimiento por limpieza (ej. salmón entero a salmón limpio con 62% yield)
  if (ingredient.prepYieldPct && ingredient.prepYieldPct > 0) {
    const rawCost = ingredient.costPerBaseUnit || 0;
    return rawCost / (ingredient.prepYieldPct / 100);
  }

  // Si tiene receta de preparación compuesta (ej. Shari)
  if (subLines.length > 0 && ingredient.prepOutputQty && ingredient.prepOutputQty > 0) {
    let totalPrepCost = 0;
    for (const line of subLines) {
      const ing = allIngredientsMap.get(line.ingredientId);
      const unitCost = ing ? ing.costPerBaseUnit || 0 : 0;
      totalPrepCost += unitCost * line.quantity;
    }
    return totalPrepCost / ingredient.prepOutputQty;
  }

  return ingredient.costPerBaseUnit || 0;
}

/**
 * Cálculo del costo total de un producto según su escandallo/receta
 */
export function calculateProductRecipeCost(
  productId: string,
  recipeLines: RecipeLineItem[],
  ingredientsMap: Map<string, IngredientStockItem>
): { totalCost: number; breakdown: Array<{ ingredientName: string; qty: number; unit: string; cost: number; pct: number }> } {
  const linesForProduct = recipeLines.filter((l) => l.productId === productId);
  let totalCost = 0;
  const rawBreakdown: Array<{ ingredientName: string; qty: number; unit: string; cost: number }> = [];

  for (const line of linesForProduct) {
    const ing = ingredientsMap.get(line.ingredientId);
    if (ing) {
      const lineCost = (ing.costPerBaseUnit || 0) * line.quantity;
      totalCost += lineCost;
      rawBreakdown.push({
        ingredientName: ing.name,
        qty: line.quantity,
        unit: ing.baseUnit,
        cost: lineCost,
      });
    }
  }

  const breakdown = rawBreakdown.map((item) => ({
    ...item,
    pct: totalCost > 0 ? Math.round((item.cost / totalCost) * 100) : 0,
  }));

  return { totalCost, breakdown };
}

/**
 * Asignación de lotes según algoritmo FEFO (First-Expired, First-Out)
 * Ordena primero por fecha de vencimiento más próxima (NULL al final), luego por fecha de recepción.
 */
export function allocateBatchesFEFO(
  batches: BatchItem[],
  neededQty: number
): { allocations: Array<{ batchId: string; batchCode: string; qty: number }>; shortage: number } {
  const sortedBatches = [...batches]
    .filter((b) => b.qtyRemaining > 0)
    .sort((a, b) => {
      if (a.expiresAt && b.expiresAt) {
        return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime();
      }
      if (a.expiresAt && !b.expiresAt) return -1;
      if (!a.expiresAt && b.expiresAt) return 1;
      return new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime();
    });

  let remainingNeeded = neededQty;
  const allocations: Array<{ batchId: string; batchCode: string; qty: number }> = [];

  for (const batch of sortedBatches) {
    if (remainingNeeded <= 0) break;
    const take = Math.min(batch.qtyRemaining, remainingNeeded);
    allocations.push({
      batchId: batch.id,
      batchCode: batch.code,
      qty: take,
    });
    remainingNeeded -= take;
  }

  return {
    allocations,
    shortage: Math.max(0, remainingNeeded),
  };
}

/**
 * Cálculo de porciones disponibles según el insumo cuello de botella de la receta
 */
export function calculateAvailablePortions(
  productId: string,
  recipeLines: RecipeLineItem[],
  ingredientsMap: Map<string, IngredientStockItem>
): number {
  const lines = recipeLines.filter((l) => l.productId === productId);
  if (lines.length === 0) return 999; // Sin receta

  let minPortions = Infinity;

  for (const line of lines) {
    if (line.quantity <= 0) continue;
    const ing = ingredientsMap.get(line.ingredientId);
    if (!ing) continue;
    const available = Math.floor(Math.max(0, ing.stockQty) / line.quantity);
    if (available < minPortions) {
      minPortions = available;
    }
  }

  return minPortions === Infinity ? 0 : minPortions;
}
