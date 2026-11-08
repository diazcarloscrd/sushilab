'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCartStore } from '@/lib/store/useCartStore';

export default function FloatingCartBar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const itemsCount = useCartStore((s) => s.getItemsCount());
  const total = useCartStore((s) => s.getTotal());

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Only display if cart has items and we are not already on cart or admin pages
  if (itemsCount === 0 || pathname === '/cart' || pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 z-40 max-w-lg mx-auto pointer-events-none">
      <Link
        href="/cart"
        className="pointer-events-auto flex items-center justify-between w-full p-2.5 pl-4 pr-3 bg-inverse-surface/95 backdrop-blur-xl text-on-primary rounded-full shadow-floating-bar border border-secondary/20 hover:scale-[1.01] active:scale-[0.98] transition-all duration-200"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center font-bold text-xs text-white shadow-sm flex-shrink-0 animate-pulse">
            {itemsCount}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] uppercase tracking-wider text-secondary-fixed font-headline font-semibold">
              Tu Comanda
            </span>
            <span className="text-sm font-bold font-headline text-inverse-on-surface truncate">
              ${total.toLocaleString('es-AR')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-white font-headline font-bold text-xs shadow-sm flex-shrink-0">
          <span>Ver Carrito</span>
          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </div>
      </Link>
    </div>
  );
}
