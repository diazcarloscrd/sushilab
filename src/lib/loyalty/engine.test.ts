import { describe, it, expect } from 'vitest';
import {
  calculatePointsEarned,
  calculatePointsDiscount,
  allocatePointsFIFO,
  EarnLedgerRow,
} from './engine';

describe('Loyalty Engine (Fase 7)', () => {
  it('calculates points earned based on tier multipliers', () => {
    // $25.000 gastados en BRONCE -> 25 puntos
    expect(calculatePointsEarned(25000, 'BRONCE')).toBe(25);
    // $25.000 gastados en PLATA (1.25x) -> floor(25 * 1.25) = 31 puntos
    expect(calculatePointsEarned(25000, 'PLATA')).toBe(31);
    // $25.000 gastados en ORO (1.5x) -> floor(25 * 1.5) = 37 puntos
    expect(calculatePointsEarned(25000, 'ORO')).toBe(37);
    // Pedido en cero o negativo
    expect(calculatePointsEarned(0, 'ORO')).toBe(0);
    expect(calculatePointsEarned(-500, 'BRONCE')).toBe(0);
  });

  it('rejects redemptions below minimum points threshold (100 pts)', () => {
    const result = calculatePointsDiscount(80, 50000, 200);
    expect(result.pointsAccepted).toBe(0);
    expect(result.discountAmount).toBe(0);
  });

  it('caps points redemption at 30% of net subtotal', () => {
    // Subtotal $20.000. 30% es $6.000.
    // Usuario pide canjear 200 pts ($10.000). Debe topar a $6.000 (120 pts x $50).
    const result = calculatePointsDiscount(200, 20000, 300);
    expect(result.discountAmount).toBe(6000);
    expect(result.pointsAccepted).toBe(120);
  });

  it('respects user points balance', () => {
    // Usuario solo tiene 120 pts, pero pide 180 pts.
    // Con subtotal $100.000 (tope $30.000 no se alcanza)
    const result = calculatePointsDiscount(180, 100000, 120);
    expect(result.pointsAccepted).toBe(120);
    expect(result.discountAmount).toBe(6000);
  });

  it('allocates FIFO points deduction by expiration date', () => {
    const now = new Date('2026-06-01T12:00:00Z');
    const ledgers: EarnLedgerRow[] = [
      { id: 'ledger-3', remaining: 50, expiresAt: '2026-10-01T00:00:00Z' },
      { id: 'ledger-1', remaining: 40, expiresAt: '2026-07-01T00:00:00Z' },
      { id: 'ledger-2', remaining: 80, expiresAt: '2026-08-01T00:00:00Z' },
    ];

    // Need 100 points:
    // ledger-1 (earliest, 40) -> 40 deducted, 60 remaining
    // ledger-2 (second, 80) -> 60 deducted, 0 remaining
    const result = allocatePointsFIFO(ledgers, 100, now);
    expect(result.shortage).toBe(0);
    expect(result.allocations).toEqual([
      { ledgerId: 'ledger-1', deducted: 40 },
      { ledgerId: 'ledger-2', deducted: 60 },
    ]);
  });
});
