'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/client/Header';
import BottomNav from '@/components/client/BottomNav';
import FloatingCartBar from '@/components/client/FloatingCartBar';
import ProductCard from '@/components/client/ProductCard';
import ProductCustomizerModal, { ProductData } from '@/components/client/ProductCustomizerModal';

interface CategoryData {
  id: string;
  name: string;
  slug: string;
  order: number;
}

export default function MenuPage() {
  const [products, setProducts] = useState<ProductData[]>([]);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategoryId, setActiveCategoryId] = useState<string>('ALL');
  const [activeDietaryFilter, setActiveDietaryFilter] = useState<string>('ALL');
  const [selectedProduct, setSelectedProduct] = useState<ProductData | null>(null);

  useEffect(() => {
    async function loadMenuData() {
      try {
        setLoading(true);
        const [prodRes, catRes] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/categories'),
        ]);

        if (prodRes.ok) {
          const prodData = await prodRes.json();
          setProducts(prodData);
        }
        if (catRes.ok) {
          const catData = await catRes.json();
          setCategories(catData);
        }
      } catch (err) {
        console.error('Error fetching menu data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadMenuData();
  }, []);

  // Filter logic: search + category + dietary
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeCategoryId !== 'ALL') {
      if (p.categoryId !== activeCategoryId) return false;
    }

    if (activeDietaryFilter === 'ALL') return true;
    if (activeDietaryFilter === 'GF') return p.dietaryTags?.includes('GF');
    if (activeDietaryFilter === 'OMAKASE') return p.dietaryTags?.includes('OMAKASE');
    if (activeDietaryFilter === 'VEGGIE') return p.dietaryTags?.includes('VEGAN') || p.dietaryTags?.includes('VEGGIE');
    return true;
  });

  return (
    <div className="bg-surface min-h-screen pb-32">
      <Header />

      <main className="max-w-3xl mx-auto pt-24 px-4 space-y-4">
        {/* Title & Craftsmanship guarantee */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <span className="font-headline text-xs uppercase tracking-wider text-primary font-bold">
              Carta Completa
            </span>
            <span className="text-[10px] bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full font-bold">
              Edición 2026
            </span>
          </div>
          <h1 className="font-headline font-bold text-2xl text-on-surface">
            Menú de Autor & Omakase
          </h1>
          <p className="text-xs text-on-surface-variant">
            Pescados frescos del día con shari madurado en Akazu rojo y salsas elaboradas en nuestro laboratorio.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <span className="absolute inset-y-0 left-3 flex items-center text-on-surface-variant pointer-events-none">
            <span className="material-symbols-outlined text-[18px]">search</span>
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por roll, nigiri, salmón, trufa, bao..."
            className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface placeholder-on-surface-variant/70 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-3 flex items-center text-on-surface-variant hover:text-on-surface"
            >
              <span className="material-symbols-outlined text-[16px]">cancel</span>
            </button>
          )}
        </div>

        {/* Dynamic Category Navigation Pills */}
        {categories.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              <button
                onClick={() => setActiveCategoryId('ALL')}
                className={`px-3.5 py-1.5 rounded-xl font-headline text-xs whitespace-nowrap active:scale-95 transition-all ${
                  activeCategoryId === 'ALL'
                    ? 'bg-primary text-white font-bold shadow-sm'
                    : 'bg-surface-container text-on-surface hover:bg-surface-container-high font-medium'
                }`}
              >
                Todas las Cartas
              </button>
              {categories.map((cat) => {
                const isSelected = activeCategoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategoryId(cat.id)}
                    className={`px-3.5 py-1.5 rounded-xl font-headline text-xs whitespace-nowrap active:scale-95 transition-all ${
                      isSelected
                        ? 'bg-primary text-white font-bold shadow-sm'
                        : 'bg-surface-container text-on-surface hover:bg-surface-container-high font-medium'
                    }`}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Dietary Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 border-t border-outline-variant/20 pt-2">
          {[
            { id: 'ALL', label: 'Todo' },
            { id: 'OMAKASE', label: '✨ Omakase' },
            { id: 'GF', label: '🌾 Celíaco Friendly (GF)' },
            { id: 'VEGGIE', label: '🥑 Vegetariano' },
          ].map((pill) => {
            const active = activeDietaryFilter === pill.id;
            return (
              <button
                key={pill.id}
                onClick={() => setActiveDietaryFilter(pill.id)}
                className={`px-3 py-1 rounded-full font-headline text-[11px] whitespace-nowrap active:scale-95 transition-all ${
                  active
                    ? 'bg-secondary text-on-secondary font-bold shadow-sm'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container font-medium'
                }`}
              >
                {pill.label}
              </button>
            );
          })}
        </div>

        {/* Products Grid */}
        <section className="space-y-3 pt-2">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
              <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <p className="text-xs font-headline font-medium">Cargando piezas de autor...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-16 text-center text-on-surface-variant text-sm bg-surface-container-low rounded-xl p-6 border border-outline-variant/30">
              <span className="material-symbols-outlined text-4xl text-outline mb-2">dinner_dining</span>
              <p className="font-headline font-semibold text-on-surface">No encontramos piezas con ese criterio</p>
              <p className="text-xs mt-1">Prueba con otra categoría, palabra clave o restablece los filtros.</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategoryId('ALL');
                  setActiveDietaryFilter('ALL');
                }}
                className="mt-3 text-xs font-headline font-bold text-primary hover:underline"
              >
                Ver todo el menú
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onOpenCustomizer={(p) => setSelectedProduct(p)}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <ProductCustomizerModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />

      <FloatingCartBar />
      <BottomNav />
    </div>
  );
}
