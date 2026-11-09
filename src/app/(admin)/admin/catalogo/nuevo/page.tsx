'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const PRESET_SUSHI_IMAGES = [
  { label: 'Nigiri / Shokunin', url: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=800&q=80' },
  { label: 'Rolls Especiales', url: 'https://images.unsplash.com/photo-1611143669185-af224c5e3252?auto=format&fit=crop&w=800&q=80' },
  { label: 'Sashimi Fresco', url: 'https://images.unsplash.com/photo-1534482421-64566f976cfa?auto=format&fit=crop&w=800&q=80' },
  { label: 'Geishas & Tiraditos', url: 'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=800&q=80' },
  { label: 'Omakase Box', url: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=800&q=80' },
];

const AVAILABLE_TAGS = [
  { id: 'OMAKASE', label: '✨ Omakase de Autor' },
  { id: 'GF', label: '🌾 Sin TACC (GF)' },
  { id: 'VEGAN', label: '🌱 Vegano' },
  { id: 'VEGGIE', label: '🥑 Vegetariano' },
  { id: 'SPICY', label: '🌶️ Picante' },
  { id: 'TRUFADO', label: '🍄 Trufado' },
];

function ProductEditorForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get('id');
  const isEditing = Boolean(productId);

  const [categories, setCategories] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [piecesCount, setPiecesCount] = useState(8);
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('14500');
  const [costPrice, setCostPrice] = useState('4200');
  const [stock, setStock] = useState('50');
  const [image, setImage] = useState(PRESET_SUSHI_IMAGES[0].url);
  const [isChefSelection, setIsChefSelection] = useState(true);
  const [isBestSeller, setIsBestSeller] = useState(false);
  const [active, setActive] = useState(true);
  const [recipeEnabled, setRecipeEnabled] = useState(true);
  const [tags, setTags] = useState<string[]>(['OMAKASE']);

  const [loadingInitial, setLoadingInitial] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Load categories and initial product if editing
  useEffect(() => {
    async function loadData() {
      try {
        const catRes = await fetch('/api/categories?all=true');
        if (catRes.ok) {
          const catList = await catRes.json();
          setCategories(catList);
          if (!productId && catList.length > 0) {
            setCategoryId(catList[0].id);
          }
        }

        if (productId) {
          const prodRes = await fetch(`/api/admin/products?id=${productId}`);
          if (prodRes.ok) {
            const prod = await prodRes.json();
            if (prod) {
              setName(prod.name || '');
              setCategoryId(prod.categoryId || '');
              setPiecesCount(prod.piecesCount || 1);
              setDescription(prod.description || '');
              setPrice(String(prod.price || 0));
              setCostPrice(String(prod.costPrice || 0));
              setStock(String(prod.stock !== undefined ? prod.stock : 50));
              setImage(prod.image || PRESET_SUSHI_IMAGES[0].url);
              setIsChefSelection(Boolean(prod.isChefSelection));
              setIsBestSeller(Boolean(prod.isBestSeller));
              setActive(Boolean(prod.active));
              setRecipeEnabled(Boolean(prod.recipeEnabled));
              setTags(Array.isArray(prod.dietaryTags) ? prod.dietaryTags : []);
            }
          } else {
            setErrorMsg('No se pudo encontrar el producto especificado');
          }
        }
      } catch (err: any) {
        console.error('Error loading product data:', err);
        setErrorMsg('Error al cargar la información');
      } finally {
        setLoadingInitial(false);
      }
    }

    loadData();
  }, [productId]);

  const numPrice = parseFloat(price) || 0;
  const numCost = parseFloat(costPrice) || 0;
  const profit = Math.max(0, numPrice - numCost);
  const marginPercent = numPrice > 0 ? Math.round((profit / numPrice) * 100) : 0;
  const foodCostPercent = numPrice > 0 ? Math.round((numCost / numPrice) * 100) : 0;

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

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload = {
        id: productId || undefined,
        name: name.trim(),
        categoryId,
        piecesCount: parseInt(String(piecesCount)) || 1,
        description: description.trim(),
        price: numPrice,
        costPrice: numCost,
        stock: parseInt(String(stock)) || 0,
        image: image.trim(),
        isChefSelection,
        isBestSeller,
        dietaryTags: tags,
        active,
        recipeEnabled,
      };

      const res = await fetch('/api/admin/products', {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar la pieza');
      }

      setSuccessMsg(isEditing ? '¡Pieza actualizada con éxito!' : '¡Pieza creada con éxito!');
      setTimeout(() => {
        router.push('/admin/catalogo');
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message);
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!productId) return;
    if (!confirm(`¿Estás seguro de que deseas eliminar o archivar "${name}"?`)) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/products?id=${productId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar');

      alert(data.message || 'Producto procesado correctamente');
      router.push('/admin/catalogo');
    } catch (err: any) {
      setErrorMsg(err.message);
      setDeleting(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="py-24 text-center text-xs text-on-surface-variant flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span>Cargando ficha gastronómica del producto...</span>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-outline-variant/30">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/catalogo"
            className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          </Link>
          <div>
            <h1 className="font-headline font-bold text-2xl text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[24px]">
                {isEditing ? 'edit_note' : 'add_circle'}
              </span>
              <span>{isEditing ? `Editar: ${name || 'Pieza'}` : 'Cargar Nueva Pieza de Autor'}</span>
            </h1>
            <p className="text-xs text-on-surface-variant">
              {isEditing
                ? 'Actualización de receta, precio de venta, escandallo y publicación en la web.'
                : 'Nueva receta Shokunin con cálculo de food cost y publicación automática en la PWA.'}
            </p>
          </div>
        </div>

        {isEditing && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="px-3 py-1.5 rounded-xl border border-error/40 text-error hover:bg-error-container/40 text-xs font-headline font-semibold flex items-center gap-1.5 transition-all"
            title="Eliminar o Archivar Producto"
          >
            <span className="material-symbols-outlined text-[16px]">delete</span>
            <span>{deleting ? 'Eliminando...' : 'Eliminar'}</span>
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-error-container text-on-error-container text-xs flex items-center gap-2 font-headline font-semibold">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950 text-emerald-200 border border-emerald-800 text-xs flex items-center gap-2 font-headline font-semibold">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{successMsg}</span>
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
                required
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary"
              >
                <option value="" disabled>
                  Selecciona una categoría...
                </option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {!c.active ? '(Oculta)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
                Cantidad de Piezas (Unidades por porción):
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
                Stock Inicial / Porciones Disponibles:
              </label>
              <input
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
              Descripción Gastronómica & Notas de Cata:
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalla los cortes de pescado, marinado, shari o salsa artesanal que compone este plato..."
              className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Pricing & Escandallo */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface-variant">
              Precios, Escandallo & Rentabilidad
            </h3>
            <span
              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                foodCostPercent <= 28
                  ? 'bg-emerald-500/10 text-emerald-500'
                  : foodCostPercent > 35
                  ? 'bg-error-container text-error'
                  : 'bg-tertiary-container/30 text-tertiary'
              }`}
            >
              Food Cost: {foodCostPercent}%
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
                Precio de Venta al Público ($ ARS):
              </label>
              <input
                type="number"
                step="100"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
                Costo Total de Insumos ($ ARS):
              </label>
              <input
                type="number"
                step="50"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary font-mono"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-container flex items-center justify-between text-xs">
            <span className="text-on-surface-variant font-medium">Margen Bruto estimado:</span>
            <div className="font-headline font-bold text-on-surface flex items-center gap-2">
              <span className="text-emerald-500">${profit.toLocaleString('es-AR')}</span>
              <span className="text-[11px] text-on-surface-variant font-normal">({marginPercent}% margen)</span>
            </div>
          </div>
        </div>

        {/* Imagen del Producto */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30 space-y-4">
          <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface-variant">
            Fotografía Shokunin
          </h3>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <img
              src={image}
              alt="Vista previa"
              className="w-24 h-24 rounded-xl object-cover bg-surface-container border border-outline-variant/40 flex-shrink-0"
            />
            <div className="w-full space-y-2">
              <label className="block text-xs font-headline font-semibold text-on-surface">
                URL de Imagen:
              </label>
              <input
                type="url"
                required
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="https://..."
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary"
              />

              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[10px] text-on-surface-variant font-semibold">Presets rápidos:</span>
                {PRESET_SUSHI_IMAGES.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setImage(preset.url)}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-surface-container hover:bg-surface-container-high text-on-surface-variant transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tags & Flags */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30 space-y-4">
          <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface-variant">
            Etiquetas Dietarias & Estado de Menú
          </h3>

          <div className="flex flex-wrap gap-2">
            {AVAILABLE_TAGS.map((t) => {
              const selected = tags.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleToggleTag(t.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-headline font-semibold border transition-all ${
                    selected
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'bg-surface-container text-on-surface border-outline-variant/40 hover:bg-surface-container-high'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-surface-container border border-outline-variant/30 cursor-pointer">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="rounded accent-primary w-4 h-4"
              />
              <span className="text-xs font-headline font-semibold text-on-surface">
                Activo en Menú
              </span>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-surface-container border border-outline-variant/30 cursor-pointer">
              <input
                type="checkbox"
                checked={isChefSelection}
                onChange={(e) => setIsChefSelection(e.target.checked)}
                className="rounded accent-primary w-4 h-4"
              />
              <span className="text-xs font-headline font-semibold text-on-surface">
                Selección del Chef
              </span>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-surface-container border border-outline-variant/30 cursor-pointer">
              <input
                type="checkbox"
                checked={isBestSeller}
                onChange={(e) => setIsBestSeller(e.target.checked)}
                className="rounded accent-primary w-4 h-4"
              />
              <span className="text-xs font-headline font-semibold text-on-surface">
                Best Seller ⭐
              </span>
            </label>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/30">
          <Link
            href="/admin/catalogo"
            className="px-5 py-2.5 rounded-xl text-xs font-headline text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-primary text-white text-xs font-headline font-bold shadow-md hover:bg-primary-container transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <span>{isEditing ? 'Guardar Cambios' : 'Publicar Pieza de Autor'}</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NuevaPiezaPage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 text-center text-xs text-on-surface-variant flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span>Cargando formulario...</span>
        </div>
      }
    >
      <ProductEditorForm />
    </Suspense>
  );
}
