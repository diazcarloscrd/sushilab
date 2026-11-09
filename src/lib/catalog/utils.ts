export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ñ/g, 'n')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export function validateCategoryInput(data: { name?: string; order?: number }) {
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    return { valid: false, error: 'El nombre de la categoría es obligatorio' };
  }
  if (data.name.trim().length > 50) {
    return { valid: false, error: 'El nombre de la categoría no puede superar los 50 caracteres' };
  }
  if (data.order !== undefined && (typeof data.order !== 'number' || isNaN(data.order) || data.order < 0)) {
    return { valid: false, error: 'El orden debe ser un número entero mayor o igual a 0' };
  }
  return { valid: true };
}
