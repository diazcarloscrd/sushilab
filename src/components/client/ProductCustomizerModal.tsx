'use client';

import React, { useState, useEffect } from 'react';
import { useCartStore, CartModifierExtra } from '@/lib/store/useCartStore';

export interface ProductData {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  piecesCount?: number | null;
  image: string;
  modifiersJson?: string | null;
  dietaryTags?: string[];
  categoryId?: string | null;
  category?: { id: string; name: string } | null;
}

interface ProductCustomizerModalProps {
  product: ProductData | null;
  onClose: () => void;
}

export default function ProductCustomizerModal({
  product,
  onClose,
}: ProductCustomizerModalProps) {
  const addItem = useCartStore((s) => s.addItem);

  // Parse modifier options
  const parsedModifiers = React.useMemo(() => {
    if (!product?.modifiersJson) return null;
    try {
      return JSON.parse(product.modifiersJson);
    } catch {
      return null;
    }
  }, [product]);

  // Form states
  const [selectedRice, setSelectedRice] = useState<string>(() => {
    if (parsedModifiers?.baseRice?.length) {
      const def = parsedModifiers.baseRice.find((r: any) => r.default);
      return def ? def.id : parsedModifiers.baseRice[0].id;
    }
    return 'akazu';
  });

  const [selectedSauces, setSelectedSauces] = useState<string[]>(() => {
    if (parsedModifiers?.sauces?.length) {
      return parsedModifiers.sauces.filter((s: any) => s.default).map((s: any) => s.name);
    }
    return ['Teriyaki artesanal'];
  });

  const [dbExtras, setDbExtras] = useState<Array<{ id: string; name: string; price: number }>>([
    { id: 'palta', name: 'Palta Hass laminada extra', price: 950 },
    { id: 'masago', name: 'Caviar Masago crocante', price: 1400 },
    { id: 'wasabi', name: 'Hon Wasabi fresco rallado en piel de tiburón', price: 1200 },
    { id: 'gari', name: 'Gari jengibre artesanal', price: 400 },
  ]);

  useEffect(() => {
    fetch('/api/modifiers')
      .then((res) => (res.ok ? res.json() : []))
      .then((groups: any[]) => {
        const extraGroup = groups.find((g) => g.id === 'grp_extras');
        if (extraGroup?.options?.length) {
          setDbExtras(
            extraGroup.options
              .filter((o: any) => o.active)
              .map((o: any) => ({
                id: o.code,
                name: o.name,
                price: Number(o.priceDelta) || 0,
              }))
          );
        }
      })
      .catch(() => {});
  }, []);

  const [selectedExtras, setSelectedExtras] = useState<CartModifierExtra[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);

  if (!product) return null;

  // Toggle sauce
  const handleToggleSauce = (sauceName: string) => {
    setSelectedSauces((prev) =>
      prev.includes(sauceName)
        ? prev.filter((s) => s !== sauceName)
        : [...prev, sauceName]
    );
  };

  // Toggle extra
  const handleToggleExtra = (extra: CartModifierExtra) => {
    setSelectedExtras((prev) =>
      prev.some((e) => e.id === extra.id)
        ? prev.filter((e) => e.id !== extra.id)
        : [...prev, extra]
    );
  };

  // Calculate unit price with modifiers
  const extraRiceCost =
    selectedRice === 'akazu' && parsedModifiers?.baseRice
      ? parsedModifiers.baseRice.find((r: any) => r.id === 'akazu')?.extraPrice || 0
      : 0;

  const extrasTotal = selectedExtras.reduce((sum, e) => sum + e.price, 0);
  const unitPrice = product.price + extraRiceCost + extrasTotal;
  const totalPrice = unitPrice * quantity;

  const handleAddToCart = () => {
    const riceName =
      parsedModifiers?.baseRice?.find((r: any) => r.id === selectedRice)?.name ||
      (selectedRice === 'akazu' ? 'Arroz fermentado en Akazu rojo' : 'Arroz Shari blanco');

    addItem({
      productId: product.id,
      name: product.name,
      price: unitPrice,
      basePrice: product.price,
      image: product.image,
      quantity,
      baseRice: riceName,
      sauces: selectedSauces,
      extras: selectedExtras,
      notes: notes.trim() || undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
      {/* Backdrop overlay */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* BottomSheet container */}
      <div className="relative w-full max-w-lg bg-surface rounded-t-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col z-10 animate-in slide-in-from-bottom duration-300">
        {/* Grab Handle */}
        <div className="w-full pt-3 pb-1 flex justify-center bg-surface sticky top-0 z-20">
          <div className="w-12 h-1.5 rounded-full bg-outline-variant/60" />
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-4 w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors z-20"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>

        {/* Modal Scrollable Content */}
        <div className="overflow-y-auto px-5 pb-6 pt-2 space-y-5 flex-1">
          {/* Header Dish info */}
          <div className="flex gap-4 items-start">
            <div className="relative w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 bg-surface-container shadow-sm border border-outline-variant/30">
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                {product.piecesCount && (
                  <span className="font-headline text-[11px] font-semibold bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full">
                    {product.piecesCount} piezas
                  </span>
                )}
                {product.dietaryTags?.map((tag) => (
                  <span
                    key={tag}
                    className="font-headline text-[10px] font-bold text-tertiary bg-tertiary-container/30 px-1.5 py-0.5 rounded-full uppercase"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <h3 className="font-headline font-bold text-lg text-on-surface mt-1 leading-snug">
                {product.name}
              </h3>
              <p className="text-xs text-on-surface-variant line-clamp-2 mt-0.5">
                {product.description}
              </p>
              <div className="text-primary font-headline font-bold text-base mt-1">
                ${product.price.toLocaleString('es-AR')}
              </div>
            </div>
          </div>

          <hr className="border-outline-variant/30" />

          {/* Section 1: Base de Arroz (Shari) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-headline font-bold text-sm text-on-surface flex items-center gap-1.5">
                <span className="text-primary">✦</span> Base de Shari (Arroz de Autor)
              </label>
              <span className="text-[10px] uppercase font-bold text-secondary font-headline tracking-wider">
                Requerido
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => setSelectedRice('akazu')}
                className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                  selectedRice === 'akazu'
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-outline-variant/50 bg-surface-container-low hover:bg-surface-container'
                }`}
              >
                <div>
                  <div className="font-headline font-semibold text-xs text-on-surface flex items-center gap-1.5">
                    <span>Arroz fermentado en Vinagre Rojo Akazu</span>
                    <span className="text-[9px] bg-primary-container text-white px-1.5 py-0.2 rounded-full font-bold">
                      Recomendado Shokunin
                    </span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">
                    Sabor umami profundo añejado 3 años en barricas de madera.
                  </p>
                </div>
                <div className="text-xs font-bold text-primary font-headline flex-shrink-0 ml-2">
                  +$600
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedRice('clasico')}
                className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                  selectedRice === 'clasico'
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-outline-variant/50 bg-surface-container-low hover:bg-surface-container'
                }`}
              >
                <div>
                  <div className="font-headline font-semibold text-xs text-on-surface">
                    Arroz Shari Tradicional
                  </div>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">
                    Vinagre de arroz blanco suave y equilibrado.
                  </p>
                </div>
                <div className="text-xs font-semibold text-on-surface-variant font-headline flex-shrink-0 ml-2">
                  Sin cargo
                </div>
              </button>
            </div>
          </div>

          {/* Section 2: Salsas Artesanales */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-headline font-bold text-sm text-on-surface flex items-center gap-1.5">
                <span className="text-secondary">✦</span> Selección de Salsas (Elige las que gustes)
              </label>
              <span className="text-[10px] text-on-surface-variant font-medium">Opcional</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { name: 'Teriyaki artesanal reducida', cost: 0 },
                { name: 'Soja baja en sodio', cost: 0 },
                { name: 'Ponzu cítrica con togarashi', cost: 300 },
                { name: 'Spicy Mayo con sésamo', cost: 350 },
              ].map((sauce) => {
                const isSelected = selectedSauces.includes(sauce.name);
                return (
                  <button
                    key={sauce.name}
                    type="button"
                    onClick={() => handleToggleSauce(sauce.name)}
                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between text-xs transition-all ${
                      isSelected
                        ? 'border-secondary bg-secondary-container/20 font-semibold'
                        : 'border-outline-variant/40 bg-surface-container-low text-on-surface-variant'
                    }`}
                  >
                    <span className="truncate pr-1">{sauce.name}</span>
                    <span className="material-symbols-outlined text-[16px] text-primary flex-shrink-0">
                      {isSelected ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Extras de Lujo */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-headline font-bold text-sm text-on-surface flex items-center gap-1.5">
                <span className="text-tertiary">✦</span> Toppings & Extras de Lujo
              </label>
              <span className="text-[10px] text-on-surface-variant font-medium">Opcional</span>
            </div>
            <div className="space-y-2">
              {dbExtras.map((extra) => {
                const isSelected = selectedExtras.some((e) => e.id === extra.id);
                return (
                  <button
                    key={extra.id}
                    type="button"
                    onClick={() => handleToggleExtra(extra)}
                    className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                      isSelected
                        ? 'border-tertiary bg-tertiary-container/15'
                        : 'border-outline-variant/40 bg-surface-container-low hover:bg-surface-container'
                    }`}
                  >
                    <span className="font-medium text-on-surface">{extra.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-headline font-bold text-tertiary">
                        +${extra.price}
                      </span>
                      <span className="material-symbols-outlined text-[18px] text-tertiary">
                        {isSelected ? 'check_box' : 'check_box_outline_blank'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 4: Notas libres para el Itamae */}
          <div>
            <label className="block font-headline font-bold text-sm text-on-surface mb-1">
              Indicaciones dietarias o notas para el Chef:
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Sin sésamo, palillos extra, alérgico a los mariscos..."
              className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface placeholder-on-surface-variant/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />
          </div>
        </div>

        {/* Modal Sticky Footer CTA */}
        <div className="p-4 bg-surface-container-low border-t border-outline-variant/30 flex items-center justify-between gap-3 sticky bottom-0 z-20">
          {/* Quantity Stepper */}
          <div className="flex items-center bg-surface-container rounded-full p-1 border border-outline-variant/40">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface disabled:opacity-40 hover:bg-surface-container-high transition-colors active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">remove</span>
            </button>
            <span className="w-8 text-center font-headline font-bold text-sm text-on-surface">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-primary text-white shadow-sm hover:bg-primary-container transition-colors active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="button"
            onClick={handleAddToCart}
            className="flex-1 py-3 px-4 rounded-full bg-primary hover:bg-primary-container text-white font-headline font-bold text-sm flex items-center justify-between shadow-md active:scale-[0.98] transition-all"
          >
            <span>Añadir a la Comanda</span>
            <span>${totalPrice.toLocaleString('es-AR')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
