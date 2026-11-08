'use client';

import React from 'react';
import { ProductData } from './ProductCustomizerModal';

interface ProductCardProps {
  product: ProductData;
  onOpenCustomizer: (product: ProductData) => void;
}

export default function ProductCard({ product, onOpenCustomizer }: ProductCardProps) {
  return (
    <article
      onClick={() => onOpenCustomizer(product)}
      className="group bg-surface-container-lowest rounded-xl p-3.5 shadow-card border border-outline-variant/30 flex gap-3.5 items-center justify-between cursor-pointer hover:border-secondary/40 hover:shadow-elevated active:scale-[0.99] transition-all duration-200"
    >
      {/* Left text column */}
      <div className="flex flex-col justify-between flex-1 min-w-0 pr-1">
        <div className="flex flex-col gap-1">
          {/* Top badges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {product.piecesCount && (
              <span className="bg-secondary-container/90 text-on-secondary-container font-headline text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {product.piecesCount} piezas
              </span>
            )}
            {product.dietaryTags?.map((tag) => (
              <span
                key={tag}
                className="bg-tertiary-container/30 text-tertiary font-headline text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Title */}
          <h4 className="font-headline font-bold text-sm text-on-surface leading-snug group-hover:text-primary transition-colors line-clamp-1">
            {product.name}
          </h4>

          {/* Description */}
          <p className="font-body text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        </div>

        {/* Price and Add button */}
        <div className="flex items-center justify-between pt-2.5 mt-1 border-t border-outline-variant/15">
          <span className="font-headline font-bold text-sm text-on-surface">
            ${product.price.toLocaleString('es-AR')}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenCustomizer(product);
            }}
            className="w-8 h-8 rounded-full bg-primary hover:bg-primary-container text-white flex items-center justify-center shadow-sm active:scale-90 transition-transform"
            aria-label={`Personalizar y añadir ${product.name}`}
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
          </button>
        </div>
      </div>

      {/* Right photo */}
      <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-lg overflow-hidden flex-shrink-0 bg-surface-container shadow-sm border border-outline-variant/20">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </article>
  );
}
