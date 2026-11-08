import { describe, it, expect } from 'vitest';
import { evaluatePricingRules, CartItemForPricing, PricingRuleCondition } from './engine';

describe('Pricing Rules Engine', () => {
  const sampleCart: CartItemForPricing[] = [
    { productId: 'p1', name: 'Roll Omakase', unitPrice: 14500, quantity: 2 }, // 29000
    { productId: 'p2', name: 'Nigiri Trufado', unitPrice: 12800, quantity: 1 }, // 12800
  ]; // Total subtotal: 41800

  it('aplica descuento por medio de pago (Transferencia 10%)', () => {
    const rules: PricingRuleCondition[] = [
      {
        id: 'r_trans',
        name: '10% Descuento por Transferencia Bancaria',
        active: true,
        priority: 10,
        stackable: false,
        kind: 'PERCENT_ORDER',
        percent: 10,
        paymentMethods: ['TRANSFERENCIA'],
      },
    ];

    const res = evaluatePricingRules(sampleCart, rules, {
      deliveryType: 'DELIVERY',
      paymentMethod: 'TRANSFERENCIA',
      deliveryFee: 1500,
    });

    expect(res.subtotal).toBe(41800);
    expect(res.discountTotal).toBe(4180); // 10% de 41800
    expect(res.total).toBe(41800 + 1500 - 4180);
    expect(res.discounts).toHaveLength(1);
    expect(res.discounts[0].label).toContain('Transferencia');
  });

  it('elige la regla más beneficiosa cuando son no acumulables', () => {
    const rules: PricingRuleCondition[] = [
      {
        id: 'r_trans',
        name: '10% Transferencia',
        active: true,
        priority: 10,
        stackable: false,
        kind: 'PERCENT_ORDER',
        percent: 10,
      },
      {
        id: 'r_takeaway',
        name: '15% Retiro en Local',
        active: true,
        priority: 10,
        stackable: false,
        kind: 'PERCENT_ORDER',
        percent: 15,
        deliveryTypes: ['TAKE_AWAY'],
      },
    ];

    const res = evaluatePricingRules(sampleCart, rules, {
      deliveryType: 'TAKE_AWAY',
      paymentMethod: 'TRANSFERENCIA',
      deliveryFee: 0,
    });

    // 15% (6270) es mayor que 10% (4180), por lo que gana el 15%
    expect(res.discountTotal).toBe(6270);
    expect(res.discounts[0].label).toContain('15% Retiro en Local');
  });

  it('calcula promoción 2x1 bonificando la pieza más económica', () => {
    const items2x1: CartItemForPricing[] = [
      { productId: 'roll_caro', name: 'Roll Trufado', unitPrice: 15000, quantity: 1 },
      { productId: 'roll_barato', name: 'Roll Clásico', unitPrice: 10000, quantity: 1 },
    ];

    const rules: PricingRuleCondition[] = [
      {
        id: 'r_2x1',
        name: '2x1 en Rolls de Autor',
        active: true,
        priority: 20,
        stackable: false,
        kind: 'BUY_X_GET_Y',
        buyQty: 1,
        getQty: 1,
      },
    ];

    const res = evaluatePricingRules(items2x1, rules, {
      deliveryType: 'DELIVERY',
      paymentMethod: 'EFECTIVO',
      deliveryFee: 1200,
    });

    // Bonifica la unidad más barata: $10.000
    expect(res.discountTotal).toBe(10000);
    expect(res.total).toBe(15000 + 10000 + 1200 - 10000);
  });
});
