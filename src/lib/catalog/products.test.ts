import { describe, it, expect } from 'vitest';
import { generateSlug } from './utils';

describe('Product Payload & Slug Logic', () => {
  it('generates unique slugs for sushi products', () => {
    const slug = generateSlug('Nigiri Trufado Shokunin');
    expect(slug).toBe('nigiri-trufado-shokunin');
  });

  it('handles complex Japanese terms and punctuation in product names', () => {
    const slug = generateSlug('Gunkan Ikura & Akami (8 piezas)');
    expect(slug).toBe('gunkan-ikura-akami-8-piezas');
  });
});
