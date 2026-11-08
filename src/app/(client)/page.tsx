'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/client/Header';
import BottomNav from '@/components/client/BottomNav';
import FloatingCartBar from '@/components/client/FloatingCartBar';
import ProductCard from '@/components/client/ProductCard';
import ProductCustomizerModal, { ProductData } from '@/components/client/ProductCustomizerModal';
import { useCartStore } from '@/lib/store/useCartStore';

const CATEGORIES = [
  { id: 'all', name: 'Todo el Menú', icon: '✨' },
  { id: 'omakase', name: 'Recomendados Omakase', icon: '🍣' },
  { id: 'rolls', name: 'Nigiris & Rolls', icon: '🥢' },
  { id: 'combos', name: 'Combos Especiales', icon: '🍱' },
  { id: 'entradas', name: 'Gyozas & Entradas', icon: '🥟' },
  { id: 'bebidas', name: 'Bebidas & Té', icon: '🍵' },
];

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<ProductData | null>(null);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [couponAppliedNotice, setCouponAppliedNotice] = useState<boolean>(false);
  const [storeStatus, setStoreStatus] = useState<{ isOpen: boolean; openHours: string }>({
    isOpen: true,
    openHours: '19:30 a 23:45 hs',
  });

  const setCouponDiscount = useCartStore((s) => s.setCouponDiscount);

  useEffect(() => {
    async function fetchMenuAndStatus() {
      try {
        const [productsRes, settingsRes] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/settings/public'),
        ]);

        if (productsRes.ok) {
          const data = await productsRes.json();
          setProducts(data);
        }

        if (settingsRes.ok) {
          const sData = await settingsRes.json();
          setStoreStatus({ isOpen: sData.isOpen, openHours: sData.openHours });
        }
      } catch (err) {
        console.error('Error cargando menú:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchMenuAndStatus();
  }, []);

  const handleApplyWelcomeCoupon = () => {
    setCouponDiscount('KANSO15', 15);
    setCouponAppliedNotice(true);
    setTimeout(() => setCouponAppliedNotice(false), 3000);
  };

  const filteredProducts = products.filter((p: any) => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'omakase') return p.isChefSelection || p.category?.slug === 'omakase';
    return p.category?.slug === selectedCategory;
  });

  const itamaeHighlights = products.filter((p) => (p as any).isChefSelection || (p as any).isBestSeller).slice(0, 3);

  return (
    <div className="bg-surface min-h-screen pb-32">
      <Header />

      <main className="max-w-3xl mx-auto pt-20 px-4 space-y-4">
        {/* Banner de Estado del Local si está cerrado */}
        {!storeStatus.isOpen && (
          <div className="bg-secondary-container/30 border border-secondary/40 text-on-secondary-container rounded-xl p-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-secondary">schedule</span>
              <span>
                <strong>Local cerrado por el momento.</strong> Horario de atención: {storeStatus.openHours}. ¡Puedes programar tu pedido para hoy!
              </span>
            </div>
          </div>
        )}

        {/* Visual Storytelling Hero: Shokunin Heritage */}
        <section className="relative w-full rounded-2xl overflow-hidden shadow-sm bg-surface-container-low border border-outline-variant/30">
          <div
            className="w-full h-48 sm:h-56 bg-cover bg-center relative"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=1200&q=80')`,
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-inverse-surface/95 via-inverse-surface/50 to-transparent" />
            
            {/* Shokunin Kanji Badge */}
            <div className="absolute top-3 right-3 bg-surface/90 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
              <span className="font-headline text-xs text-primary font-bold">職人技</span>
              <span className="font-headline text-xs text-on-surface font-semibold">Bahía Blanca</span>
            </div>

            {/* Hero Copy */}
            <div className="absolute bottom-3 left-4 right-4 flex flex-col gap-1 text-on-primary">
              <span className="font-headline text-[11px] uppercase tracking-wider text-secondary-fixed font-bold">
                Sushi de Autor en Bahía Blanca
              </span>
              <h2 className="font-headline font-bold text-xl sm:text-2xl text-inverse-on-surface leading-tight">
                El auténtico arte del Shari Akazu y técnica Edo
              </h2>
            </div>
          </div>

          {/* Trust Badges & ETA strip */}
          <div className="px-4 py-2.5 bg-surface-container flex items-center justify-between text-on-surface text-xs">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[17px]">timer</span>
              <span className="font-headline font-semibold">25–35 min</span>
              <span className="w-1 h-1 rounded-full bg-outline-variant" />
              <span className="font-headline font-bold text-tertiary">Envío Directo</span>
            </div>
            <div className="flex items-center gap-1 bg-surface px-2.5 py-0.5 rounded-full shadow-sm">
              <span className="material-symbols-outlined text-secondary text-[14px]">star</span>
              <span className="font-headline font-bold text-on-surface">4.9</span>
              <span className="text-[11px] text-on-surface-variant">(Bahía Blanca)</span>
            </div>
          </div>
        </section>

        {/* Special Promotion Banner */}
        <section className="relative overflow-hidden bg-primary-container text-on-primary rounded-xl p-3.5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-white text-[22px]">redeem</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-headline text-[11px] text-primary-fixed uppercase tracking-wider font-bold">
                Bienvenido a Yankun Sushi Lab
              </span>
              <p className="font-headline font-bold text-sm text-white truncate">
                15% OFF en tu primer pedido
              </p>
              <span className="text-[11px] text-primary-fixed-dim">
                Con Mercado Pago, Transferencia o Efectivo
              </span>
            </div>
          </div>

          <button
            onClick={handleApplyWelcomeCoupon}
            className="bg-white text-primary font-headline text-xs px-3.5 py-2 rounded-full shadow-sm font-bold flex-shrink-0 active:scale-95 transition-transform"
          >
            {couponAppliedNotice ? '✓ Aplicado!' : 'KANSO15'}
          </button>
        </section>

        {/* Category Filter Rail */}
        <section className="pt-2 pb-1">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-full font-headline text-xs whitespace-nowrap active:scale-95 transition-all flex items-center gap-1.5 ${
                    active
                      ? 'bg-inverse-surface text-inverse-on-surface font-bold shadow-sm'
                      : 'bg-surface-container text-on-surface hover:bg-surface-container-high font-medium'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Craftsmanship Guarantee Strip */}
        <div className="bg-surface-container-low px-3.5 py-2 rounded-lg flex items-center justify-between text-on-surface-variant text-xs border border-outline-variant/30">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-tertiary text-[16px]">verified</span>
            <span className="font-medium">Salmón fresco seleccionado & Arroz Akazu en Bahía Blanca</span>
          </div>
          <span className="font-headline font-bold text-primary text-[11px]">100% Shokunin</span>
        </div>

        {/* Selección del Itamae (Featured) */}
        {selectedCategory === 'all' && itamaeHighlights.length > 0 && (
          <section className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="font-headline font-bold text-base text-on-surface">
                Selección del Itamae
              </h3>
              <span className="text-xs text-on-surface-variant font-medium">
                Piezas de Autor destacadas
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {itamaeHighlights.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onOpenCustomizer={(p) => setSelectedProduct(p)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Main Menu Feed */}
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="font-headline font-bold text-base text-on-surface">
              {CATEGORIES.find((c) => c.id === selectedCategory)?.name || 'Carta Completa'}
            </h3>
            <span className="text-xs text-on-surface-variant">
              {filteredProducts.length} opciones disponibles
            </span>
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
              <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <p className="text-xs font-headline font-medium">Preparando la barra de sushi...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-12 text-center text-on-surface-variant text-sm">
              No hay piezas disponibles en esta categoría por el momento.
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

      {/* Product Customizer BottomSheet Modal */}
      <ProductCustomizerModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />

      {/* Dynamic Floating Cart Bar */}
      <FloatingCartBar />

      {/* PWA Fixed Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
