export const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDIENTE_PAGO: ['EN_COCINA', 'CANCELADO'],
  PENDIENTE_VERIFICACION: ['EN_COCINA', 'CANCELADO'],
  CREADO: ['EN_COCINA', 'CANCELADO'],
  EN_COCINA: ['LISTO', 'CANCELADO'],
  LISTO: ['EN_CAMINO', 'ENTREGADO', 'CANCELADO'],
  EN_CAMINO: ['ENTREGADO', 'CANCELADO'],
  ENTREGADO: ['CANCELADO'], // Solo emergencias o auditoría
  CANCELADO: [],
};

export function canTransition(from: string, to: string, role: string): boolean {
  if (from === to) return true;

  const allowedNext = VALID_TRANSITIONS[from];
  if (!allowedNext || !allowedNext.includes(to)) {
    return false;
  }

  if (role === 'SUPERADMIN' || role === 'SYSTEM') {
    return true;
  }

  if (role === 'ADMIN_LOCAL') {
    // ADMIN_LOCAL puede todo excepto revertir ENTREGADO a CANCELADO sin autorización
    if (from === 'ENTREGADO' && to === 'CANCELADO') return false;
    return true;
  }

  if (role === 'COCINERO') {
    // Cocinero solo puede marcar como LISTO desde EN_COCINA
    return from === 'EN_COCINA' && to === 'LISTO';
  }

  if (role === 'REPARTIDOR') {
    // Repartidor solo puede marcar como ENTREGADO desde EN_CAMINO
    return from === 'EN_CAMINO' && to === 'ENTREGADO';
  }

  return false;
}
