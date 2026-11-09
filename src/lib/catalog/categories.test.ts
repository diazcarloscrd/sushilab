import { describe, it, expect } from 'vitest';
import { generateSlug, validateCategoryInput } from './utils';

describe('Catalog Utils & Category Validation', () => {
  it('generates clean URL-friendly slugs from Spanish text with accents', () => {
    expect(generateSlug('Nigiris & Sashimis Especiales')).toBe('nigiris-sashimis-especiales');
    expect(generateSlug('Rolls Clásicos - Selección Salmón')).toBe('rolls-clasicos-seleccion-salmon');
    expect(generateSlug('   Bebidas & Coctelería   ')).toBe('bebidas-cocteleria');
  });

  it('validates correct category payload', () => {
    const res = validateCategoryInput({ name: 'Rolls Clásicos', order: 1 });
    expect(res.valid).toBe(true);
    expect(res.error).toBeUndefined();
  });

  it('rejects empty or whitespace-only category names', () => {
    expect(validateCategoryInput({ name: '' }).valid).toBe(false);
    expect(validateCategoryInput({ name: '   ' }).valid).toBe(false);
    expect(validateCategoryInput({}).valid).toBe(false);
  });

  it('rejects invalid order numbers', () => {
    expect(validateCategoryInput({ name: 'Válido', order: -5 }).valid).toBe(false);
  });
});
