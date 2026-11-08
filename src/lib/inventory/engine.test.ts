import { describe, it, expect } from 'vitest';
import {
  calculateIngredientUnitCost,
  calculateProductRecipeCost,
  allocateBatchesFEFO,
  calculateAvailablePortions,
  IngredientStockItem,
  BatchItem,
  RecipeLineItem,
} from './engine';

describe('Inventory Engine', () => {
  it('calcula costo de insumo con merma de limpieza (yield %)', () => {
    // Salmón entero cuesta $18.000 por kg ($18/g), con rendimiento 62%
    const salmonEntero: IngredientStockItem = {
      id: 'ing_salmon_raw',
      name: 'Salmón Entero',
      kind: 'RAW',
      baseUnit: 'G',
      costPerBaseUnit: 18,
      stockQty: 10000,
      minStock: 2000,
      tracksBatches: true,
      isCritical: true,
    };

    const salmonLimpio: IngredientStockItem = {
      id: 'ing_salmon_clean',
      name: 'Salmón Limpio para Sashimi',
      kind: 'PREP',
      baseUnit: 'G',
      costPerBaseUnit: 18,
      stockQty: 4000,
      minStock: 1000,
      tracksBatches: true,
      isCritical: true,
      prepYieldPct: 62,
    };

    const costClean = calculateIngredientUnitCost(salmonLimpio);
    // 18 / 0.62 = ~29.032/g
    expect(costClean).toBeCloseTo(29.032, 2);
  });

  it('asigna lotes respetando vencimiento FEFO (el que vence antes primero)', () => {
    const batches: BatchItem[] = [
      {
        id: 'b_later',
        ingredientId: 'ing_salmon',
        code: 'LOT-2026-11-12',
        qtyRemaining: 500,
        unitCost: 20,
        receivedAt: '2026-11-08T10:00:00Z',
        expiresAt: '2026-11-12T10:00:00Z',
      },
      {
        id: 'b_sooner',
        ingredientId: 'ing_salmon',
        code: 'LOT-2026-11-09',
        qtyRemaining: 300,
        unitCost: 19,
        receivedAt: '2026-11-08T08:00:00Z',
        expiresAt: '2026-11-09T18:00:00Z',
      },
    ];

    const result = allocateBatchesFEFO(batches, 400);
    // Toma primero 300 de b_sooner (vence mañana) y luego 100 de b_later
    expect(result.allocations).toHaveLength(2);
    expect(result.allocations[0].batchId).toBe('b_sooner');
    expect(result.allocations[0].qty).toBe(300);
    expect(result.allocations[1].batchId).toBe('b_later');
    expect(result.allocations[1].qty).toBe(100);
    expect(result.shortage).toBe(0);
  });

  it('calcula porciones disponibles según el insumo más limitante', () => {
    const ingredientsMap = new Map<string, IngredientStockItem>([
      [
        'shari',
        {
          id: 'shari',
          name: 'Shari',
          kind: 'PREP',
          baseUnit: 'G',
          costPerBaseUnit: 2,
          stockQty: 1600, // 1600g disponible
          minStock: 200,
          tracksBatches: false,
          isCritical: true,
        },
      ],
      [
        'salmon',
        {
          id: 'salmon',
          name: 'Salmón Limpio',
          kind: 'PREP',
          baseUnit: 'G',
          costPerBaseUnit: 30,
          stockQty: 400, // 400g disponible
          minStock: 100,
          tracksBatches: true,
          isCritical: true,
        },
      ],
    ]);

    // Receta roll: 160g de shari (rinde 10 porciones con 1600g), 80g de salmón (rinde 5 porciones con 400g)
    const lines: RecipeLineItem[] = [
      { id: 'l1', productId: 'p_roll', ingredientId: 'shari', quantity: 160 },
      { id: 'l2', productId: 'p_roll', ingredientId: 'salmon', quantity: 80 },
    ];

    const portions = calculateAvailablePortions('p_roll', lines, ingredientsMap);
    // El cuello de botella es el salmón: 400 / 80 = 5 porciones
    expect(portions).toBe(5);
  });
});
