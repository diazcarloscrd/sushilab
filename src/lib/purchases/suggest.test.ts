import { describe, it, expect } from 'vitest';
import { generatePurchaseSuggestions, formatWhatsAppPurchaseOrder, SuggestionInput } from './suggest';

describe('Purchase Suggestions Engine', () => {
  it('identifica insumos bajo stock mínimo y calcula cantidad de compra', () => {
    const mockIngredients: SuggestionInput[] = [
      {
        id: 'salmon',
        name: 'Salmón Entero',
        baseUnit: 'G',
        purchaseUnit: 'kg',
        purchaseFactor: 1000,
        stockQty: 2500, // Menor que 3000 minStock
        minStock: 3000,
        costPerBaseUnit: 18,
      },
      {
        id: 'nori',
        name: 'Alga Nori',
        baseUnit: 'UNIT',
        purchaseUnit: 'paquete x50',
        purchaseFactor: 50,
        stockQty: 400, // Mayor que 100
        minStock: 100,
        costPerBaseUnit: 150,
      },
    ];

    const suggestions = generatePurchaseSuggestions(mockIngredients);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].ingredientId).toBe('salmon');
    // needed = 3000 * 2 - 2500 = 3500g -> ceil(3500 / 1000) = 4 kg
    expect(suggestions[0].suggestedPurchaseQty).toBe(4);
    expect(suggestions[0].purchaseUnit).toBe('kg');
  });

  it('formatea el texto de WhatsApp para la Orden de Compra', () => {
    const encoded = formatWhatsAppPurchaseOrder(104, 'Pesquera Mar Austral', [
      { name: 'Salmón Rosado Entero', qty: 5, unit: 'kg' },
    ]);
    const decoded = decodeURIComponent(encoded);
    expect(decoded).toContain('Orden de Compra #104');
    expect(decoded).toContain('Pesquera Mar Austral');
    expect(decoded).toContain('5 kg');
  });
});
