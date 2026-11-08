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
  category?: { name: string };
  dietaryTags?: string[];
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
  const [activeTab, setActiveTab] = useState<'PRODUCTS' | 'RECIPES' | 'EXTRAS'>('PRODUCTS');
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [modifiers, setModifiers] = useState<ModifierOptionItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCatalogData = async () => {
    try {
      setLoading(true);
      const [prodRes, modRes] = await Promise.all([
        fetch('/api/admin/products'),
        fetch('/api/modifiers'),
      ]);

      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProducts(prodData);
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
      await fetch('/api/admin/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, active: !currentActive }),
      });
    } catch (e) {
      console.error('Error toggling product status:', e);
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
      await fetch('/api/admin/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, stock: newStock }),
      });
    } catch (e) {
      console.error('Error updating product stock:', e);
      fetchCatalogData();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-headline font-bold text-2xl text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[28px]">menu_book</span>
            Catálogo & Escandallo Shokunin
          </h1>
          <p className="text-xs text-on-surface-variant mt-1">
            Gestión de piezas de autor, costeo de recetas en tiempo real, márgenes y extras oficiales.
          </p>
        </div>

        <Link
          href="/admin/catalogo/nuevo"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white font-headline text-xs font-bold shadow-md hover:bg-primary-container transition-all self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>Nueva Pieza de Autor</span>
        </Link>
      </div>

      {/* Navegación por pestañas */}
      <div className="flex items-center gap-2 border-b border-outline-variant/30 pb-2">
        {[
          { key: 'PRODUCTS', label: 'Productos del Menú', icon: 'restaurant_menu' },
          { key: 'RECIPES', label: 'Escandallo & Food Cost %', icon: 'receipt_long' },
          { key: 'EXTRAS', label: 'Extras & Modificadores', icon: 'tune' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-headline font-semibold transition-all ${
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
        <div className="p-12 text-center text-xs text-on-surface-variant">
          Cargando catálogo oficial de Yankun Sushi Lab...
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
                            <div className="font-headline font-bold text-on-surface">{p.name}</div>
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

                      <td className="py-3 px-3 text-right font-headline font-bold text-on-surface">
                        ${p.price.toLocaleString('es-AR')}
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
                        <Link
                          href={`/admin/catalogo/nuevo?id=${p.id}`}
                          className="w-8 h-8 rounded-lg bg-surface-container-high hover:bg-surface-container-highest inline-flex items-center justify-center text-on-surface-variant transition-colors"
                          title="Editar Ficha"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'RECIPES' ? (
        /* Pestaña 2: Escandallo & Food Cost */
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
        /* Pestaña 3: Extras */
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
    </div>
  );
}
