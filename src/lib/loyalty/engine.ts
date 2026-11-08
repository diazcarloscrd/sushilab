export interface LoyaltyTierConfig {
  code: string;
  min90d: number;
  multiplier: number;
}

export const DEFAULT_LOYALTY_TIERS: Record<string, number> = {
  BRONCE: 1.0,
  PLATA: 1.25,
  ORO: 1.5,
};

export const POINT_VALUE_ARS = 50; // 1 punto = $50 ARS (100 puntos = $5.000)
export const AMOUNT_PER_POINT = 1000; // 1 punto cada $1.000 gastados
export const MIN_REDEEM_POINTS = 100; // Mínimo para canjear: 100 puntos ($5.000)
export const MAX_REDEEM_PERCENT = 0.30; // Máximo 30% del subtotal neto
export const EXPIRY_MONTHS = 6;

/**
 * Calcula los puntos ganados por un pedido entregado.
 * Base = subtotal - descuentos de reglas/cupones - descuento de puntos.
 */
export function calculatePointsEarned(
  netSubtotal: number,
  tier: string = 'BRONCE'
): number {
  if (netSubtotal <= 0) return 0;
  const multiplier = DEFAULT_LOYALTY_TIERS[tier.toUpperCase()] || 1.0;
  const points = Math.floor((netSubtotal / AMOUNT_PER_POINT) * multiplier);
  return Math.max(0, points);
}

/**
 * Calcula el descuento monetario aplicable por canje de puntos con tope porcentual.
 */
export function calculatePointsDiscount(
  pointsToRedeem: number,
  subtotalAfterDiscounts: number,
  userBalance: number
): { pointsAccepted: number; discountAmount: number } {
  if (pointsToRedeem < MIN_REDEEM_POINTS) {
    return { pointsAccepted: 0, discountAmount: 0 };
  }

  // No puede canjear más puntos de los que tiene
  const availablePoints = Math.min(pointsToRedeem, Math.max(0, userBalance));
  if (availablePoints < MIN_REDEEM_POINTS) {
    return { pointsAccepted: 0, discountAmount: 0 };
  }

  const maxAllowedDiscount = Math.max(0, subtotalAfterDiscounts * MAX_REDEEM_PERCENT);
  const nominalDiscount = availablePoints * POINT_VALUE_ARS;

  if (nominalDiscount <= maxAllowedDiscount) {
    return {
      pointsAccepted: availablePoints,
      discountAmount: nominalDiscount,
    };
  }

  // Si el valor nominal excede el tope, ajustamos los puntos al máximo permitido
  const cappedPoints = Math.floor(maxAllowedDiscount / POINT_VALUE_ARS);
  if (cappedPoints < MIN_REDEEM_POINTS) {
    return { pointsAccepted: 0, discountAmount: 0 };
  }

  return {
    pointsAccepted: cappedPoints,
    discountAmount: cappedPoints * POINT_VALUE_ARS,
  };
}

export interface EarnLedgerRow {
  id: string;
  remaining: number;
  expiresAt: string | Date | null;
}

/**
 * Asignación FIFO de canje de puntos sobre los lotes de puntos vigentes.
 */
export function allocatePointsFIFO(
  ledgers: EarnLedgerRow[],
  pointsToRedeem: number,
  currentTime: Date = new Date()
): { allocations: Array<{ ledgerId: string; deducted: number }>; shortage: number } {
  // Filtrar vigentes y ordenar por vencimiento más próximo primero
  const validLedgers = ledgers
    .filter((l) => l.remaining > 0 && (!l.expiresAt || new Date(l.expiresAt) > currentTime))
    .sort((a, b) => {
      const aTime = a.expiresAt ? new Date(a.expiresAt).getTime() : Infinity;
      const bTime = b.expiresAt ? new Date(b.expiresAt).getTime() : Infinity;
      return aTime - bTime;
    });

  let remainingToDeduct = pointsToRedeem;
  const allocations: Array<{ ledgerId: string; deducted: number }> = [];

  for (const ledger of validLedgers) {
    if (remainingToDeduct <= 0) break;
    const canDeduct = Math.min(ledger.remaining, remainingToDeduct);
    allocations.push({ ledgerId: ledger.id, deducted: canDeduct });
    remainingToDeduct -= canDeduct;
  }

  return {
    allocations,
    shortage: remainingToDeduct,
  };
}
