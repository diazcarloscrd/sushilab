'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCartStore } from '@/lib/store/useCartStore';

export default function BottomNav() {
  const pathname = usePathname();
  const itemsCount = useCartStore((s) => s.getItemsCount());

  // Do not render bottom nav on admin routes
  if (pathname.startsWith('/admin')) {
    return null;
  }

  const tabs = [
    {
      label: 'Inicio',
      icon: 'home',
      href: '/',
      active: pathname === '/',
    },
    {
      label: 'Menú Shokunin',
      icon: 'restaurant_menu',
      href: '/menu',
      active: pathname === '/menu',
    },
    {
      label: 'Carrito',
      icon: 'shopping_bag',
      href: '/cart',
      active: pathname === '/cart',
      badge: itemsCount > 0 ? itemsCount : null,
    },
    {
      label: 'Mi Pedido',
      icon: 'schedule',
      href: '/pedido/ultimo',
      active: pathname.startsWith('/pedido'),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 pb-safe bg-surface/95 backdrop-blur-xl border-t border-outline-variant/30 shadow-[0_-2px_12px_rgba(0,0,0,0.05)] md:hidden">
      <div className="h-16 px-4 flex items-center justify-around">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            href={tab.href}
            className={`flex flex-col items-center justify-center relative w-16 py-1 transition-all touch-press ${
              tab.active ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <div className="relative flex items-center justify-center">
              <span
                className="material-symbols-outlined text-[24px]"
                style={tab.active ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                {tab.icon}
              </span>
              {tab.badge && (
                <span className="absolute -top-1 -right-2 bg-primary text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center shadow-sm">
                  {tab.badge}
                </span>
              )}
            </div>
            <span
              className={`text-[11px] font-headline mt-0.5 tracking-tight ${
                tab.active ? 'font-bold' : 'font-medium'
              }`}
            >
              {tab.label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
