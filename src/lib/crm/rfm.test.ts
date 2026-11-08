import { describe, it, expect } from 'vitest';
import { classifyCustomerSegment } from './rfm';

describe('Customer RFM Segmentation', () => {
  const baseDate = new Date('2026-11-08T12:00:00Z');

  it('clasifica cliente como VIP si supera 6 pedidos o $150.000 en 90 días', () => {
    const seg = classifyCustomerSegment(
      {
        ordersCount: 8,
        totalSpent: 160000,
        orders90d: 6,
        spent90d: 120000,
        lastOrderAt: '2026-11-05T12:00:00Z',
      },
      baseDate
    );
    expect(seg).toBe('VIP');
  });

  it('clasifica como FRECUENTE si tiene pedidos recurrentes en 30 días', () => {
    const seg = classifyCustomerSegment(
      {
        ordersCount: 3,
        totalSpent: 45000,
        orders90d: 3,
        spent90d: 45000,
        lastOrderAt: '2026-11-02T12:00:00Z', // Hace 6 días
      },
      baseDate
    );
    expect(seg).toBe('FRECUENTE');
  });

  it('clasifica como EN_RIESGO si pasaron entre 31 y 60 días sin pedir', () => {
    const seg = classifyCustomerSegment(
      {
        ordersCount: 4,
        totalSpent: 60000,
        orders90d: 1,
        spent90d: 15000,
        lastOrderAt: '2026-09-25T12:00:00Z', // Hace 44 días
      },
      baseDate
    );
    expect(seg).toBe('EN_RIESGO');
  });

  it('clasifica como DORMIDO si pasaron más de 60 días sin pedir', () => {
    const seg = classifyCustomerSegment(
      {
        ordersCount: 2,
        totalSpent: 28000,
        orders90d: 0,
        spent90d: 0,
        lastOrderAt: '2026-08-01T12:00:00Z', // Hace más de 90 días
      },
      baseDate
    );
    expect(seg).toBe('DORMIDO');
  });
});
