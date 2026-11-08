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
  piecesCount: number;
  image: string;
  active: boolean;
  category?: { name: string };
  dietaryTags?: string[];
}

export default function AdminCatalogoPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/admin/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (err) {
      console.error('Error fetching catalog:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
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
      fetchProducts();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-outline-variant/30">
        <div>
          <span className="font-headline text-xs uppercase tracking-wider text-secondary font-bold">
            Escandallo & Rentabilidad
          </span>
          <h1 className="font-headline font-bold text-2xl text-on-surface mt-0.5">
            Gestión de Catálogo & Fichas de Autor
          </h1>
          <p className="text-xs text-on-surface-variant">
            Administra precios de venta, costos de materia prima, márgenes brutos y activación online.
          </p>
        </div>

        <Link
          href="/admin/catalogo/nuevo"
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary hover:bg-primary-container text-white font-headline text-xs font-bold shadow-sm transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          <span>Nueva Pieza de Autor</span>
        </Link>
      </div>

      {/* Products List / Table */}
      <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30 space-y-4">
        {loading ? (
          <div className="py-12 text-center text-xs text-on-surface-variant">
            Cargando recetas de autor...
          </div>
        ) : products.length === 0 ? (
          <div className="py-12 text-center text-xs text-on-surface-variant">
            No hay productos cargados en el catálogo.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-outline-variant/20 text-on-surface-variant font-headline font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-3">Pieza / Receta</th>
                  <th className="py-3 px-3">Categoría</th>
                  <th className="py-3 px-3">Precio Venta</th>
                  <th className="py-3 px-3">Costo Materia Prima</th>
                  <th className="py-3 px-3">Margen Bruto</th>
                  <th className="py-3 px-3">Estado Online</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/15 text-on-surface">
                {products.map((p) => {
                  const grossMargin =
                    p.price > 0
                      ? Math.round(((p.price - (p.costPrice || 0)) / p.price) * 100)
                      : 0;

                  return (
                    <tr key={p.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={p.image}
                            alt={p.name}
                            className="w-12 h-12 rounded-lg object-cover bg-surface-container border border-outline-variant/20 flex-shrink-0"
                          />
                          <div>
                            <div className="font-headline font-bold text-on-surface">
                              {p.name}
                            </div>
                            <div className="text-[10px] text-on-surface-variant line-clamp-1 max-w-xs">
                              {p.description}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="bg-surface-container px-2.5 py-1 rounded-full text-[10px] font-headline font-semibold">
                          {p.category?.name || 'General'}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-headline font-bold text-on-surface">
                        ${p.price.toLocaleString('es-AR')}
                      </td>

                      <td className="py-3 px-3 text-on-surface-variant">
                        ${(p.costPrice || 0).toLocaleString('es-AR')}
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-headline font-bold text-[10px] ${
                            grossMargin >= 65
                              ? 'bg-tertiary-container/30 text-tertiary'
                              : grossMargin >= 50
                              ? 'bg-secondary-container text-on-secondary-container'
                              : 'bg-error-container text-on-error-container'
                          }`}
                        >
                          <span>{grossMargin}%</span>
                          <span className="text-[9px]">
                            {grossMargin >= 65 ? '★ Óptimo' : grossMargin >= 50 ? 'Medio' : 'Bajo'}
                          </span>
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(p.id, p.active)}
                          className={`px-3 py-1 rounded-full text-[10px] font-headline font-bold transition-all ${
                            p.active
                              ? 'bg-primary text-white shadow-sm'
                              : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                          }`}
                        >
                          {p.active ? 'Activo en Web' : 'Pausado'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
