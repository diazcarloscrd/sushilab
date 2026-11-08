export interface CustomerMetricsInput {
  ordersCount: number;
  totalSpent: number;
  orders90d: number;
  spent90d: number;
  firstOrderAt?: string | Date | null;
  lastOrderAt?: string | Date | null;
}

export type CustomerSegment = 'NUEVO' | 'FRECUENTE' | 'VIP' | 'EN_RIESGO' | 'DORMIDO';

export function classifyCustomerSegment(
  metrics: CustomerMetricsInput,
  currentDate: Date = new Date()
): CustomerSegment {
  const { ordersCount, orders90d, spent90d, lastOrderAt } = metrics;

  if (ordersCount === 0 || !lastOrderAt) {
    return 'NUEVO';
  }

  const lastOrderTime = new Date(lastOrderAt).getTime();
  const diffDays = Math.floor((currentDate.getTime() - lastOrderTime) / (1000 * 60 * 60 * 24));

  // 1. VIP: 6 o más pedidos en 90 días o más de $150.000 gastados en 90 días
  if (orders90d >= 6 || spent90d >= 150000) {
    return 'VIP';
  }

  // 2. DORMIDO: Más de 60 días sin pedir
  if (diffDays > 60) {
    return 'DORMIDO';
  }

  // 3. EN RIESGO: Entre 31 y 60 días sin pedir pero con al menos 2 pedidos históricos
  if (diffDays >= 31 && diffDays <= 60 && ordersCount >= 2) {
    return 'EN_RIESGO';
  }

  // 4. FRECUENTE: Al menos 2 pedidos y compra en los últimos 30 días
  if (ordersCount >= 2 && diffDays <= 30) {
    return 'FRECUENTE';
  }

  // 5. NUEVO: 1 solo pedido
  return 'NUEVO';
}
