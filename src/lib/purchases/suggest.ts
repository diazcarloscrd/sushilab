export interface SuggestionInput {
  id: string;
  name: string;
  baseUnit: string;
  purchaseUnit?: string | null;
  purchaseFactor: number;
  stockQty: number;
  minStock: number;
  supplierId?: string | null;
  costPerBaseUnit: number;
}

export interface PurchaseSuggestion {
  ingredientId: string;
  name: string;
  currentStock: number;
  minStock: number;
  neededBaseQty: number;
  suggestedPurchaseQty: number;
  purchaseUnit: string;
  estimatedCost: number;
  supplierId?: string | null;
}

export function generatePurchaseSuggestions(
  ingredients: SuggestionInput[]
): PurchaseSuggestion[] {
  const suggestions: PurchaseSuggestion[] = [];

  for (const ing of ingredients) {
    if (ing.stockQty <= ing.minStock) {
      // Necesidad en unidad base: al menos alcanzar el doble del mínimo o reponer stock de seguridad
      const neededBaseQty = Math.max(0, ing.minStock * 2 - ing.stockQty);
      const factor = Number(ing.purchaseFactor) || 1;
      const suggestedPurchaseQty = Math.ceil(neededBaseQty / factor);
      const estimatedCost = suggestedPurchaseQty * factor * (ing.costPerBaseUnit || 0);

      suggestions.push({
        ingredientId: ing.id,
        name: ing.name,
        currentStock: ing.stockQty,
        minStock: ing.minStock,
        neededBaseQty,
        suggestedPurchaseQty,
        purchaseUnit: ing.purchaseUnit || ing.baseUnit,
        estimatedCost,
        supplierId: ing.supplierId,
      });
    }
  }

  return suggestions;
}

export function formatWhatsAppPurchaseOrder(
  poNumber: number,
  supplierName: string,
  items: Array<{ name: string; qty: number; unit: string }>
): string {
  let msg = `🍣 *YANKUN SUSHI LAB — Orden de Compra #${poNumber}*\n`;
  msg += `Hola ${supplierName}, te enviamos el pedido de insumos para cocina:\n\n`;

  items.forEach((item, idx) => {
    msg += `${idx + 1}. *${item.name}*: ${item.qty} ${item.unit}\n`;
  });

  msg += `\n📍 Entrega en Alsina 350, Bahía Blanca.\nMuchas gracias!`;
  return encodeURIComponent(msg);
}
