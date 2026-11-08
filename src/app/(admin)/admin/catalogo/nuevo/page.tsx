'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NuevaPiezaPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [piecesCount, setPiecesCount] = useState(8);
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('14500');
  const [costPrice, setCostPrice] = useState('4200');
  const [image, setImage] = useState(
    'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=800&q=80'
  );
  const [isChefSelection, setIsChefSelection] = useState(true);
  const [isBestSeller, setIsBestSeller] = useState(false);
  const [tags, setTags] = useState<string[]>(['OMAKASE']);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch('/api/categories');
        if (res.ok) {
          const data = await res.json();
          setCategories(data);
          if (data.length > 0) setCategoryId(data[0].id);
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    }
    loadCategories();
  }, []);

  const numPrice = parseFloat(price) || 0;
  const numCost = parseFloat(costPrice) || 0;
  const profit = Math.max(0, numPrice - numCost);
  const marginPercent = numPrice > 0 ? Math.round((profit / numPrice) * 100) : 0;

  const handleToggleTag = (tag: string) => {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('El nombre de la pieza es requerido.');
      return;
    }
    if (!categoryId) {
      setErrorMsg('Selecciona una categoría.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          categoryId,
          piecesCount,
          description,
          price: numPrice,
          costPrice: numCost,
          image,
          isChefSelection,
          isBestSeller,
          dietaryTags: tags,
          active: true,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al guardar la pieza');
      }

      router.push('/admin/catalogo');
    } catch (err: any) {
      setErrorMsg(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Bar */}
      <div className="flex items-center gap-3 pb-4 border-b border-outline-variant/30">
        <Link
          href="/admin/catalogo"
          className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface hover:bg-surface-container-high transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        </Link>
        <div>
          <h1 className="font-headline font-bold text-2xl text-on-surface">
            Cargar Pieza de Autor
          </h1>
          <p className="text-xs text-on-surface-variant">
            Nueva receta Shokunin con cálculo de escandallo y publicación en la PWA.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-error-container text-on-error-container text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">error</span>
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30 space-y-4">
          <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface-variant">
            Ficha Gastronómica
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
                Nombre de la Pieza o Roll:
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Nigiri Salmón Trufado con Akazu"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
                Categoría:
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
              Descripción & Ingredientes de Autor:
            </label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalla los pescados, emulsiones, tipo de shari y maridaje sugerido..."
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
                Cantidad de Piezas:
              </label>
              <input
                type="number"
                min="1"
                value={piecesCount}
                onChange={(e) => setPiecesCount(parseInt(e.target.value) || 1)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
                URL Fotografía de Alta Resolución:
              </label>
              <input
                type="url"
                required
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Photo Preview */}
          {image && (
            <div className="pt-2">
              <span className="block text-[11px] font-headline font-medium text-on-surface-variant mb-1">
                Vista previa fotográfica:
              </span>
              <div className="relative w-36 h-28 rounded-xl overflow-hidden bg-surface-container border border-outline-variant/30">
                <img src={image} alt="Preview" className="w-full h-full object-cover" />
              </div>
            </div>
          )}
        </div>

        {/* Escandallo & Rentabilidad */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30 space-y-4">
          <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-secondary">
            Escandallo Financiero en Vivo
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
                Precio de Venta al Público ($):
              </label>
              <input
                type="number"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
                Costo Materia Prima / Escandallo ($):
              </label>
              <input
                type="number"
                required
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Margen Display */}
          <div className="p-4 rounded-xl bg-surface-container flex items-center justify-between">
            <div>
              <div className="font-headline font-bold text-sm text-on-surface">
                Margen Bruto Unitario: ${profit.toLocaleString('es-AR')}
              </div>
              <p className="text-[11px] text-on-surface-variant">
                Rendimiento financiero por orden servida
              </p>
            </div>

            <div
              className={`px-3 py-1.5 rounded-full font-headline font-extrabold text-sm ${
                marginPercent >= 65
                  ? 'bg-tertiary-container text-on-tertiary-container'
                  : marginPercent >= 50
                  ? 'bg-secondary-container text-on-secondary-container'
                  : 'bg-error-container text-on-error-container'
              }`}
            >
              {marginPercent}% Margen
            </div>
          </div>
        </div>

        {/* Tags & Badges */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30 space-y-3">
          <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface-variant">
            Etiquetas & Distintivos
          </h3>

          <div className="flex flex-wrap gap-2">
            {[
              { id: 'OMAKASE', label: '✨ Omakase Signature' },
              { id: 'BESTSELLER', label: '🔥 Bestseller' },
              { id: 'GF', label: '🌾 Celíaco Friendly (GF)' },
              { id: 'CHEF_SELECTION', label: '🔪 Selección del Itamae' },
              { id: 'VEGGIE', label: '🥑 Veggie' },
            ].map((tag) => {
              const active = tags.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => handleToggleTag(tag.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-headline font-bold transition-all ${
                    active
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  {tag.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 rounded-full bg-primary hover:bg-primary-container text-white font-headline font-bold text-sm shadow-md transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading ? (
            <span>Guardando en Catálogo...</span>
          ) : (
            <>
              <span className="material-symbols-outlined text-[20px]">check_circle</span>
              <span>Guardar y Publicar en Tienda</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
