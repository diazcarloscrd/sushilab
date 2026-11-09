'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface ProductItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  costPrice: number;
  stock: number;
  availablePortions?: number | null;
  recipeEnabled?: boolean;
  autoPaused?: boolean;
  piecesCount: number;
  image: string;
  active: boolean;
  categoryId?: string;
  category?: { id: string; name: string };
  dietaryTags?: string[];
}

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  order: number;
  active: boolean;
  imageUrl?: string | null;
  productsCount?: number;
  activeProductsCount?: number;
}

interface ModifierOptionItem {
  id: string;
  groupId: string;
  code: string;
  name: string;
  priceDelta: number;
  active: boolean;
}

export default function AdminCatalogoPage() {
  const [activeTab, setActiveTab] = useState<'PRODUCTS' | 'CATEGORIES' | 'RECIPES' | 'EXTRAS'>('PRODUCTS');
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [modifiers, setModifiers] = useState<ModifierOptionItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Toast feedback
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Category modal state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryOrder, setCategoryOrder] = useState<number>(0);
  const [categoryActive, setCategoryActive] = useState<boolean>(true);
  const [categoryImageUrl, setCategoryImageUrl] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);

  // Inline Quick Price Modal state
  const [quickPriceProduct, setQuickPriceProduct] = useState<ProductItem | null>(null);
  const [quickPriceVal, setQuickPriceVal] = useState<string>('');
  const [quickCostVal, setQuickCostVal] = useState<string>('');
  const [savingQuickPrice, setSavingQuickPrice] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchCatalogData = async () => {
    try {
      setLoading(true);
      const [prodRes, catRes, modRes] = await Promise.all([
        fetch('/api/admin/products'),
        fetch('/api/categories?all=true'),
        fetch('/api/modifiers'),
      ]);

      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProducts(prodData);
      }
      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(catData);
      }
      if (modRes.ok) {
        const modGroups = await modRes.json();
        const allOpts: ModifierOptionItem[] = [];
        modGroups.forEach((g: any) => {
          (g.options || []).forEach((o: any) => allOpts.push(o));
        });
        setModifiers(allOpts);
      }
    } catch (err) {
      console.error('Error fetching catalog data:', err);
      showToast('Error cargando los datos del catálogo', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalogData();
  }, []);

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, active: !currentActive } : p))
      );
      const res = await fetch('/api/admin/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, active: !currentActive }),
      });
      if (!res.ok) throw new Error('Error al actualizar');
      showToast(`Producto ${!currentActive ? 'activado' : 'ocultado'}`);
    } catch (e) {
      console.error('Error toggling product status:', e);
      showToast('No se pudo cambiar el estado del producto', 'error');
      fetchCatalogData();
    }
  };

  const handleUpdateStock = async (id: string, delta: number) => {
    const current = products.find((p) => p.id === id);
    if (!current) return;
    const newStock = Math.max(0, (current.stock || 0) + delta);

    try {
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, stock: newStock } : p))
      );
      const res = await fetch('/api/admin/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, stock: newStock }),
      });
      if (!res.ok) throw new Error('Error al actualizar stock');
      showToast(`Stock de ${current.name}: ${newStock} un.`);
    } catch (e) {
      console.error('Error updating product stock:', e);
      showToast('Error al actualizar el stock', 'error');
      fetchCatalogData();
    }
  };

  // Quick Price Update
  const handleOpenQuickPrice = (product: ProductItem) => {
    setQuickPriceProduct(product);
    setQuickPriceVal(String(product.price));
    setQuickCostVal(String(product.costPrice || 0));
  };

  const handleSaveQuickPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPriceProduct) return;
    setSavingQuickPrice(true);
    try {
      const res = await fetch('/api/admin/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: quickPriceProduct.id,
          price: parseFloat(quickPriceVal) || 0,
          costPrice: parseFloat(quickCostVal) || 0,
        }),
      });
      if (!res.ok) throw new Error('Error al guardar precio');
      showToast(`Precios actualizados para ${quickPriceProduct.name}`);
      setQuickPriceProduct(null);
      fetchCatalogData();
    } catch (err: any) {
      showToast(err.message || 'Error al actualizar precio', 'error');
    } finally {
      setSavingQuickPrice(false);
    }
  };

  // Category Actions
  const handleOpenCategoryModal = (cat?: CategoryItem) => {
    if (cat) {
      setEditingCategory(cat);
      setCategoryName(cat.name);
      setCategoryOrder(cat.order);
      setCategoryActive(cat.active);
      setCategoryImageUrl(cat.imageUrl || '');
    } else {
      setEditingCategory(null);
      setCategoryName('');
      setCategoryOrder(categories.length);
      setCategoryActive(true);
      setCategoryImageUrl('');
    }
    setShowCategoryModal(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) {
      showToast('El nombre de la categoría es obligatorio', 'error');
      return;
    }

    setSavingCategory(true);
    try {
      if (editingCategory) {
        // PATCH
        const res = await fetch('/api/categories', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingCategory.id,
            name: categoryName.trim(),
            order: Number(categoryOrder),
            active: categoryActive,
            imageUrl: categoryImageUrl.trim() || null,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al actualizar categoría');
        showToast(`Categoría "${categoryName}" actualizada con éxito`);
      } else {
        // POST
        const res = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: categoryName.trim(),
            order: Number(categoryOrder),
            active: categoryActive,
            imageUrl: categoryImageUrl.trim() || null,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al crear categoría');
        showToast(`Categoría "${categoryName}" creada exitosamente`);
      }

      setShowCategoryModal(false);
      fetchCatalogData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSavingCategory(false);
    }
  };

  const handleToggleCategoryActive = async (cat: CategoryItem) => {
    try {
      const res = await fetch('/api/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: cat.id,
          active: !cat.active,
        }),
      });
      if (!res.ok) throw new Error('Error al cambiar visibilidad');
      showToast(`Categoría ${!cat.active ? 'activada' : 'ocultada'}`);
      fetchCatalogData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteCategory = async (cat: CategoryItem) => {
    if ((cat.productsCount || 0) > 0) {
      showToast(
        `No se puede eliminar "${cat.name}" porque contiene ${cat.productsCount} producto(s). Reasigna los productos primero.`,
        'error'
      );
      return;
    }

    if (!confirm(`¿Estás seguro de eliminar la categoría "${cat.name}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/categories?id=${cat.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar categoría');
      showToast(`Categoría "${cat.name}" eliminada`);
      fetchCatalogData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border text-xs font-headline font-semibold flex items-center gap-2 transition-all animate-bounce ${
            toast.type === 'success'
              ? 'bg-emerald-950 text-emerald-200 border-emerald-800'
              : 'bg-red-950 text-red-200 border-red-800'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            {toast.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-headline font-bold text-2xl text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[28px]">menu_book</span>
            Catálogo & Escandallo Shokunin
          </h1>
          <p className="text-xs text-on-surface-variant mt-1">
            Gestión completa de piezas de autor, categorías dinámicas, costeo en tiempo real y extras oficiales.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'CATEGORIES' ? (
            <button
              onClick={() => handleOpenCategoryModal()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white font-headline text-xs font-bold shadow-md hover:bg-primary-container transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>Nueva Categoría</span>
            </button>
          ) : (
            <Link
              href="/admin/catalogo/nuevo"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white font-headline text-xs font-bold shadow-md hover:bg-primary-container transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>Nueva Pieza de Autor</span>
            </Link>
          )}
        </div>
      </div>

      {/* Navegación por pestañas */}
      <div className="flex items-center gap-2 border-b border-outline-variant/30 pb-2 overflow-x-auto">
        {[
          { key: 'PRODUCTS', label: `Productos (${products.length})`, icon: 'restaurant_menu' },
          { key: 'CATEGORIES', label: `Categorías (${categories.length})`, icon: 'category' },
          { key: 'RECIPES', label: 'Escandallo & Food Cost %', icon: 'receipt_long' },
          { key: 'EXTRAS', label: `Extras (${modifiers.length})`, icon: 'tune' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-headline font-semibold transition-all whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-primary text-white shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-on-surface-variant flex flex-col items-center justify-center gap-2">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span>Cargando catálogo oficial de Yankun Sushi Lab...</span>
        </div>
      ) : activeTab === 'PRODUCTS' ? (
        /* Pestaña 1: Productos */
        <div className="bg-surface-container rounded-2xl border border-outline-variant/40 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-on-surface">
              <thead className="bg-surface-container-high/60 border-b border-outline-variant/30 font-headline uppercase text-[10px] text-on-surface-variant font-bold">
                <tr>
                  <th className="py-3 px-4">Producto</th>
                  <th className="py-3 px-3">Categoría</th>
                  <th className="py-3 px-3 text-right">Precio Venta</th>
                  <th className="py-3 px-3 text-right">Costo Insumos</th>
                  <th className="py-3 px-3 text-center">Food Cost %</th>
                  <th className="py-3 px-3 text-center">Porciones Disp.</th>
                  <th className="py-3 px-3 text-center">Estado Menú</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {products.map((p) => {
                  const foodCostPct = p.price > 0 ? Math.round(((p.costPrice || 0) / p.price) * 100) : 0;
                  const isFoodCostOptimo = foodCostPct <= 28;
                  const isFoodCostAlerta = foodCostPct > 35;

                  return (
                    <tr key={p.id} className="hover:bg-surface-container-high/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={p.image}
                            alt={p.name}
                            className="w-12 h-12 rounded-lg object-cover bg-surface-container-high border border-outline-variant/20 flex-shrink-0"
                          />
                          <div>
                            <div className="font-headline font-bold text-on-surface flex items-center gap-1.5">
                              <span>{p.name}</span>
                              {p.piecesCount > 1 && (
                                <span className="text-[10px] text-on-surface-variant font-normal">
                                  ({p.piecesCount} piezas)
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-on-surface-variant line-clamp-1 max-w-xs">
                              {p.description}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="bg-surface-container-high px-2 py-0.5 rounded-full text-[10px] font-semibold">
                          {p.category?.name || 'General'}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleOpenQuickPrice(p)}
                          className="font-headline font-bold text-on-surface hover:text-primary hover:underline transition-colors cursor-pointer"
                          title="Clic para editar precio y costo rápido"
                        >
                          ${p.price.toLocaleString('es-AR')}
                        </button>
                      </td>

                      <td className="py-3 px-3 text-right font-headline text-on-surface-variant">
                        ${(p.costPrice || 0).toLocaleString('es-AR', { maximumFractionDigits: 1 })}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-headline font-bold text-[10px] ${
                            isFoodCostOptimo
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : isFoodCostAlerta
                              ? 'bg-error-container text-error'
                              : 'bg-tertiary-container/30 text-tertiary'
                          }`}
                        >
                          <span>{foodCostPct}%</span>
                          <span className="text-[9px]">
                            {isFoodCostOptimo ? 'Óptimo' : isFoodCostAlerta ? 'Alerta' : 'Medio'}
                          </span>
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateStock(p.id, -5)}
                            className="w-5 h-5 rounded bg-surface-container-high hover:bg-surface-container-highest font-bold text-xs"
                            title="Restar 5 unidades"
                          >
                            -
                          </button>
                          <span
                            className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                              (p.stock || 0) <= 5
                                ? 'bg-error-container text-error'
                                : 'bg-surface-container-high text-on-surface'
                            }`}
                          >
                            {p.availablePortions != null ? p.availablePortions : p.stock ?? 50}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateStock(p.id, 5)}
                            className="w-5 h-5 rounded bg-surface-container-high hover:bg-surface-container-highest font-bold text-xs"
                            title="Sumar 5 unidades"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        {p.autoPaused ? (
                          <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[10px] font-bold">
                            Pausado por stock
                          </span>
                        ) : (
                          <button
                            onClick={() => handleToggleActive(p.id, p.active)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-headline font-semibold text-[10px] transition-all ${
                              p.active
                                ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                                : 'bg-surface-container-highest text-on-surface-variant'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {p.active ? 'Activo' : 'Oculto'}
                          </button>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Link
                            href={`/admin/catalogo/nuevo?id=${p.id}`}
                            className="w-8 h-8 rounded-lg bg-surface-container-high hover:bg-surface-container-highest inline-flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
                            title="Editar Ficha Completa"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'CATEGORIES' ? (
        /* Pestaña 2: Categorías */
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/40 text-xs text-on-surface-variant flex items-center justify-between">
            <div>
              💡 <strong>Configuración de Categorías:</strong> Establece el orden de visualización de las cartas del menú.
              Las categorías activas se publican en tiempo real en la Web App del cliente.
            </div>
          </div>

          <div className="bg-surface-container rounded-2xl border border-outline-variant/40 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-on-surface">
                <thead className="bg-surface-container-high/60 border-b border-outline-variant/30 font-headline uppercase text-[10px] text-on-surface-variant font-bold">
                  <tr>
                    <th className="py-3 px-4 w-16 text-center">Orden</th>
                    <th className="py-3 px-4">Categoría</th>
                    <th className="py-3 px-4">Slug URL</th>
                    <th className="py-3 px-3 text-center">Productos Asignados</th>
                    <th className="py-3 px-3 text-center">Estado Menú</th>
                    <th className="py-3 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {categories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-surface-container-high/30 transition-colors">
                      <td className="py-3 px-4 text-center font-mono font-bold text-on-surface-variant">
                        #{cat.order}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {cat.imageUrl ? (
                            <img
                              src={cat.imageUrl}
                              alt={cat.name}
                              className="w-8 h-8 rounded-lg object-cover bg-surface-container-high border border-outline-variant/20"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
                              <span className="material-symbols-outlined text-[18px]">restaurant</span>
                            </div>
                          )}
                          <span className="font-headline font-bold text-sm text-on-surface">
                            {cat.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-on-surface-variant">
                        /{cat.slug}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="bg-surface-container-high px-2.5 py-1 rounded-full font-headline font-bold text-[11px]">
                          {cat.productsCount || 0} piezas
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => handleToggleCategoryActive(cat)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-headline font-semibold text-[10px] transition-all ${
                            cat.active
                              ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                              : 'bg-surface-container-highest text-on-surface-variant'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {cat.active ? 'Activa' : 'Oculta'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenCategoryModal(cat)}
                            className="w-8 h-8 rounded-lg bg-surface-container-high hover:bg-surface-container-highest inline-flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
                            title="Editar Categoría"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(cat)}
                            className={`w-8 h-8 rounded-lg inline-flex items-center justify-center transition-colors ${
                              (cat.productsCount || 0) > 0
                                ? 'opacity-40 cursor-not-allowed text-on-surface-variant bg-surface-container-high'
                                : 'bg-surface-container-high hover:bg-error-container text-on-surface-variant hover:text-error'
                            }`}
                            title={
                              (cat.productsCount || 0) > 0
                                ? 'No se puede eliminar: tiene productos asignados'
                                : 'Eliminar Categoría'
                            }
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'RECIPES' ? (
        /* Pestaña 3: Escandallo & Food Cost */
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/40 text-xs text-on-surface-variant">
            💡 En gastronomía japonesa y sushi de autor, el <strong>Food Cost objetivo recomendado es entre 28% y 35%</strong>.
            Cualquier producto por encima del 35% se resalta en rojo para revisión de precios o sustitución de insumo.
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {products
              .filter((p) => p.recipeEnabled)
              .map((p) => {
                const fcPct = p.price > 0 ? ((p.costPrice || 0) / p.price) * 100 : 0;
                return (
                  <div
                    key={p.id}
                    className="p-5 rounded-2xl bg-surface-container border border-outline-variant/40 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-headline font-bold text-sm text-on-surface">{p.name}</h3>
                        <span className="text-[10px] text-on-surface-variant">
                          Precio venta: ${p.price.toLocaleString('es-AR')}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-headline font-bold text-xs text-primary block">
                          Costo: ${p.costPrice.toFixed(1)}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                            fcPct <= 28
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : fcPct > 35
                              ? 'bg-error-container text-error'
                              : 'bg-tertiary-container/30 text-tertiary'
                          }`}
                        >
                          Food Cost: {fcPct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      ) : (
        /* Pestaña 4: Extras */
        <div className="bg-surface-container rounded-2xl border border-outline-variant/40 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-on-surface">
              <thead className="bg-surface-container-high/60 border-b border-outline-variant/30 font-headline uppercase text-[10px] text-on-surface-variant font-bold">
                <tr>
                  <th className="py-3 px-4">Código Extra</th>
                  <th className="py-3 px-3">Nombre Opcional</th>
                  <th className="py-3 px-3 text-right">Precio Adicional</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {modifiers.map((m) => (
                  <tr key={m.id} className="hover:bg-surface-container-high/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-primary">{m.code}</td>
                    <td className="py-3 px-3 font-semibold">{m.name}</td>
                    <td className="py-3 px-3 text-right font-headline font-bold text-tertiary">
                      +${m.priceDelta.toLocaleString('es-AR')}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        Activo
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Categoría (Crear / Editar) */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
              <h2 className="font-headline font-bold text-base text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">
                  {editingCategory ? 'edit' : 'add_circle'}
                </span>
                <span>{editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}</span>
              </h2>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
                  Nombre de la Categoría:
                </label>
                <input
                  type="text"
                  required
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="Ej: Nigiris de Autor, Omakase Boxes..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
                    Orden de Visualización:
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={categoryOrder}
                    onChange={(e) => setCategoryOrder(parseInt(e.target.value) || 0)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary"
                  />
                  <p className="text-[10px] text-on-surface-variant mt-0.5">Menor número aparece primero</p>
                </div>

                <div>
                  <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
                    Visibilidad:
                  </label>
                  <button
                    type="button"
                    onClick={() => setCategoryActive(!categoryActive)}
                    className={`w-full py-2 px-3 text-xs rounded-xl border font-headline font-semibold flex items-center justify-center gap-2 transition-all ${
                      categoryActive
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500'
                        : 'bg-surface-container border-outline-variant/40 text-on-surface-variant'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {categoryActive ? 'visibility' : 'visibility_off'}
                    </span>
                    <span>{categoryActive ? 'Activa en Menú' : 'Oculta'}</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
                  URL de Icono o Foto (Opcional):
                </label>
                <input
                  type="url"
                  value={categoryImageUrl}
                  onChange={(e) => setCategoryImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/30">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-headline text-on-surface-variant hover:bg-surface-container"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingCategory}
                  className="px-5 py-2 rounded-xl bg-primary text-white text-xs font-headline font-bold hover:bg-primary-container disabled:opacity-50"
                >
                  {savingCategory ? 'Guardando...' : editingCategory ? 'Guardar Cambios' : 'Crear Categoría'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edición Rápida de Precio */}
      {quickPriceProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
              <div>
                <h3 className="font-headline font-bold text-sm text-on-surface">
                  Actualizar Precio
                </h3>
                <p className="text-[11px] text-on-surface-variant line-clamp-1">{quickPriceProduct.name}</p>
              </div>
              <button
                onClick={() => setQuickPriceProduct(null)}
                className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveQuickPrice} className="space-y-3">
              <div>
                <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
                  Precio de Venta ($ ARS):
                </label>
                <input
                  type="number"
                  step="100"
                  required
                  value={quickPriceVal}
                  onChange={(e) => setQuickPriceVal(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
                  Costo de Insumos ($ ARS):
                </label>
                <input
                  type="number"
                  step="50"
                  value={quickCostVal}
                  onChange={(e) => setQuickCostVal(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/30">
                <button
                  type="button"
                  onClick={() => setQuickPriceProduct(null)}
                  className="px-3 py-1.5 rounded-xl text-xs font-headline text-on-surface-variant hover:bg-surface-container"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingQuickPrice}
                  className="px-4 py-1.5 rounded-xl bg-primary text-white text-xs font-headline font-bold hover:bg-primary-container disabled:opacity-50"
                >
                  {savingQuickPrice ? 'Actualizando...' : 'Actualizar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
