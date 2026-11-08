import { describe, it, expect } from 'vitest';
import { computeMenuEngineering, RawMenuItemInput } from './engine';

describe('Menu Engineering Engine (BCG Matrix - Fase 8)', () => {
  it('correctly classifies items into Estrella, Caballo, Puzzle, Perro', () => {
    const rawItems: RawMenuItemInput[] = [
      // High volume (100 units), high margin ($12.000 - $3.000 = $9.000) -> ESTRELLA
      { productId: 'p1', name: 'Roll New York con Philadelfia', unitsSold: 100, sellingPrice: 12000, unitCost: 3000 },
      // High volume (100 units), low margin ($7.000 - $5.500 = $1.500) -> CABALLO
      { productId: 'p2', name: 'Gyozas Tradicionales', unitsSold: 100, sellingPrice: 7000, unitCost: 5500 },
      // Low volume (5 units), high margin ($15.000 - $4.000 = $11.000) -> PUZZLE
      { productId: 'p3', name: 'Nigiri Especial Trufado', unitsSold: 5, sellingPrice: 15000, unitCost: 4000 },
      // Low volume (4 units), low margin ($6.000 - $5.000 = $1.000) -> PERRO
      { productId: 'p4', name: 'Edamame Simple', unitsSold: 4, sellingPrice: 6000, unitCost: 5000 },
    ];

    const report = computeMenuEngineering(rawItems, '2026-01-01', '2026-01-31');

    expect(report.items.length).toBe(4);
    const p1 = report.items.find((i) => i.productId === 'p1');
    const p2 = report.items.find((i) => i.productId === 'p2');
    const p3 = report.items.find((i) => i.productId === 'p3');
    const p4 = report.items.find((i) => i.productId === 'p4');

    expect(p1?.quadrant).toBe('ESTRELLA');
    expect(p2?.quadrant).toBe('CABALLO');
    expect(p3?.quadrant).toBe('PUZZLE');
    expect(p4?.quadrant).toBe('PERRO');

    expect(report.quadrantCounts.ESTRELLA).toBe(1);
    expect(report.quadrantCounts.CABALLO).toBe(1);
    expect(report.quadrantCounts.PUZZLE).toBe(1);
    expect(report.quadrantCounts.PERRO).toBe(1);
  });

  it('handles empty menu gracefully without dividing by zero', () => {
    const report = computeMenuEngineering([]);
    expect(report.items).toEqual([]);
    expect(report.avgMarginThreshold).toBe(0);
    expect(report.quadrantCounts.ESTRELLA).toBe(0);
  });
});
