import { describe, it, expect } from 'vitest';
import { calculateOrderQuote, DbProductForQuote, DbModifierOptionForQuote } from './quote';
import { canTransition } from './transitions';

describe('calculateOrderQuote', () => {
  const mockProducts = new Map<string, DbProductForQuote>([
    ['p1', { id: 'p1', name: 'Roll Omakase 10pz', price: 12000, stock: 20, active: true }],
    ['p2', { id: 'p2', name: 'Nigiri Salmón 5pz', price: 9000, stock: 15, active: true }],
    ['p_agotado', { id: 'p_agotado', name: 'Combo Omakase', price: 25000, stock: 0, active: true }],
  ]);

  const mockModifiers = new Map<string, DbModifierOptionForQuote>([
    ['palta', { code: 'palta', name: 'Palta Hass', priceDelta: 950, active: true }],
    ['masago', { code: 'masago', name: 'Caviar Masago', priceDelta: 1400, active: true }],
    ['arroz_akazu', { code: 'arroz_akazu', name: 'Arroz Akazu', priceDelta: 350, active: true }],
  ]);

  it('calcula subtotal y total correctamente para un producto simple', () => {
    const res = calculateOrderQuote(
      [{ productId: 'p1', quantity: 2 }],
      mockProducts,
      mockModifiers,
      { deliveryType: 'TAKE_AWAY', deliveryFee: 0, takeawayDiscountPercent: 15 }
    );

    expect(res.valid).toBe(true);
    expect(res.subtotal).toBe(24000);
    expect(res.discount).toBe(3600); // 15% de 24000
    expect(res.total).toBe(20400);
    expect(res.validatedItems).toHaveLength(1);
    expect(res.validatedItems[0].quantity).toBe(2);
  });

  it('suma extras y arroz especial de la base de datos', () => {
    const res = calculateOrderQuote(
      [
        {
          productId: 'p1',
          quantity: 1,
          baseRice: 'arroz_akazu', // +350
          extras: [{ id: 'palta' }, { id: 'masago' }], // +950 + 1400
        },
      ],
      mockProducts,
      mockModifiers,
      { deliveryType: 'DELIVERY', deliveryFee: 1500, isWithinDeliveryZone: true }
    );

    expect(res.valid).toBe(true);
    // Unit price = 12000 + 350 + 950 + 1400 = 14700
    expect(res.subtotal).toBe(14700);
    expect(res.deliveryFee).toBe(1500);
    expect(res.total).toBe(16200);
  });

  it('rechaza si un producto está agotado', () => {
    const res = calculateOrderQuote(
      [{ productId: 'p_agotado', quantity: 1 }],
      mockProducts,
      mockModifiers,
      { deliveryType: 'TAKE_AWAY', deliveryFee: 0 }
    );

    expect(res.valid).toBe(false);
    expect(res.error).toContain('agotado');
  });

  it('rechaza si está fuera de cobertura en delivery', () => {
    const res = calculateOrderQuote(
      [{ productId: 'p1', quantity: 1 }],
      mockProducts,
      mockModifiers,
      { deliveryType: 'DELIVERY', deliveryFee: 0, isWithinDeliveryZone: false }
    );

    expect(res.valid).toBe(false);
    expect(res.error).toContain('FUERA_DE_COBERTURA');
  });
});

describe('canTransition', () => {
  it('permite transiciones válidas según rol', () => {
    expect(canTransition('CREADO', 'EN_COCINA', 'ADMIN_LOCAL')).toBe(true);
    expect(canTransition('EN_COCINA', 'LISTO', 'COCINERO')).toBe(true);
    expect(canTransition('EN_CAMINO', 'ENTREGADO', 'REPARTIDOR')).toBe(true);
  });

  it('bloquea transiciones no permitidas para roles limitados', () => {
    expect(canTransition('CREADO', 'CANCELADO', 'COCINERO')).toBe(false);
    expect(canTransition('LISTO', 'EN_CAMINO', 'COCINERO')).toBe(false);
    expect(canTransition('EN_COCINA', 'ENTREGADO', 'REPARTIDOR')).toBe(false);
  });

  it('SUPERADMIN puede forzar cancelación desde ENTREGADO', () => {
    expect(canTransition('ENTREGADO', 'CANCELADO', 'SUPERADMIN')).toBe(true);
    expect(canTransition('ENTREGADO', 'CANCELADO', 'ADMIN_LOCAL')).toBe(false);
  });
});
