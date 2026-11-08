import { MenuEngineeringItem, MenuQuadrant, MenuEngineeringReportData } from '@/types/reports';

export interface RawMenuItemInput {
  productId: string;
  name: string;
  unitsSold: number;
  sellingPrice: number;
  unitCost: number;
}

export function computeMenuEngineering(
  rawItems: RawMenuItemInput[],
  fromStr: string = '',
  toStr: string = ''
): MenuEngineeringReportData {
  const activeItems = rawItems.filter((i) => i.unitsSold > 0);
  const totalUnits = activeItems.reduce((acc, i) => acc + i.unitsSold, 0);
  const n = activeItems.length;

  if (n === 0 || totalUnits === 0) {
    return {
      from: fromStr,
      to: toStr,
      avgMarginThreshold: 0,
      popularityThresholdPct: 0,
      items: [],
      quadrantCounts: { ESTRELLA: 0, CABALLO: 0, PUZZLE: 0, PERRO: 0 },
    };
  }

  // Margen ponderado promedio
  const totalGrossMargin = activeItems.reduce(
    (acc, i) => acc + (i.sellingPrice - i.unitCost) * i.unitsSold,
    0
  );
  const avgMarginThreshold = totalGrossMargin / totalUnits;

  // Umbral de popularidad: 70% de la participación media (1/N)
  const popularityThresholdPct = (1 / n) * 0.70;

  const items: MenuEngineeringItem[] = activeItems.map((item) => {
    const popularityPct = item.unitsSold / totalUnits;
    const marginPerUnit = item.sellingPrice - item.unitCost;
    const totalMargin = marginPerUnit * item.unitsSold;

    const isHighPopularity = popularityPct >= popularityThresholdPct;
    const isHighMargin = marginPerUnit >= avgMarginThreshold;

    let quadrant: MenuQuadrant;
    let recommendation: string;

    if (isHighPopularity && isHighMargin) {
      quadrant = 'ESTRELLA';
      recommendation = 'Mantener estándar de calidad constante y destacar en combos insignia.';
    } else if (isHighPopularity && !isHighMargin) {
      quadrant = 'CABALLO';
      recommendation = 'Alta demanda pero margen bajo. Evaluar ajuste leve de precio o reducir costos de receta.';
    } else if (!isHighPopularity && isHighMargin) {
      quadrant = 'PUZZLE';
      recommendation = 'Gran rentabilidad pero baja salida. Promocionar activamente o sugerir en check-out.';
    } else {
      quadrant = 'PERRO';
      recommendation = 'Baja venta y baja rentabilidad. Considerar reformular receta o retirar de la carta.';
    }

    return {
      productId: item.productId,
      name: item.name,
      unitsSold: item.unitsSold,
      popularityPct: Math.round(popularityPct * 1000) / 10, // Porcentaje ej: 14.5%
      marginPerUnit,
      totalMargin,
      quadrant,
      recommendation,
    };
  });

  // Ordenar por margen total descendente
  items.sort((a, b) => b.totalMargin - a.totalMargin);

  const quadrantCounts: Record<MenuQuadrant, number> = {
    ESTRELLA: items.filter((i) => i.quadrant === 'ESTRELLA').length,
    CABALLO: items.filter((i) => i.quadrant === 'CABALLO').length,
    PUZZLE: items.filter((i) => i.quadrant === 'PUZZLE').length,
    PERRO: items.filter((i) => i.quadrant === 'PERRO').length,
  };

  return {
    from: fromStr,
    to: toStr,
    avgMarginThreshold: Math.round(avgMarginThreshold),
    popularityThresholdPct: Math.round(popularityThresholdPct * 1000) / 10,
    items,
    quadrantCounts,
  };
}
