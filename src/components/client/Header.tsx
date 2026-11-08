'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCartStore } from '@/lib/store/useCartStore';

interface PublicStoreInfo {
  storeName: string;
  storeAddress: string;
  storeCity: string;
  isOpen: boolean;
  openHours: string;
  whatsapp: string;
}

export default function Header() {
  const { deliveryType, deliveryZoneName } = useCartStore();
  const [storeInfo, setStoreInfo] = useState<PublicStoreInfo>({
    storeName: 'Yankun Sushi Lab — Bahía Blanca',
    storeAddress: 'Alsina 350, Centro, Bahía Blanca',
    storeCity: 'Bahía Blanca',
    isOpen: true,
    openHours: '19:30 a 23:45 hs',
    whatsapp: '+5492915556677',
  });

  useEffect(() => {
    async function loadPublicInfo() {
      try {
        const res = await fetch('/api/settings/public');
        if (res.ok) {
          const data = await res.json();
          setStoreInfo(data);
        }
      } catch (e) {
        // Fallback default
      }
    }
    loadPublicInfo();
  }, []);

  const cleanWhatsapp = storeInfo.whatsapp.replace(/[^0-9]/g, '');

  return (
    <header className="fixed top-0 w-full z-40 pt-safe bg-surface/90 backdrop-blur-xl border-b border-outline-variant/30 shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
      <div className="h-16 max-w-5xl mx-auto px-4 flex items-center justify-between gap-3">
        {/* Brand Crest */}
        <Link href="/" className="flex items-center gap-2.5 min-w-0 group">
          <div className="w-10 h-10 rounded-full bg-inverse-surface flex items-center justify-center text-on-primary shadow-sm border border-secondary/30 flex-shrink-0 group-active:scale-95 transition-transform">
            <span className="font-headline font-bold text-inverse-primary text-base">鮨</span>
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1">
              <span className="font-headline font-bold text-base text-on-surface tracking-tight">Yankun</span>
              <span className="font-headline text-xs uppercase tracking-wider text-primary font-bold">館</span>
              <span className="text-[10px] bg-secondary-container text-on-secondary-container px-1.5 py-0.2 rounded-full font-semibold">LAB</span>
              {!storeInfo.isOpen && (
                <span className="text-[9px] bg-error-container text-on-error-container px-1.5 py-0.5 rounded-full font-bold ml-1">
                  CERRADO
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-on-surface-variant text-xs">
              <span className="material-symbols-outlined text-primary text-[13px]">location_on</span>
              <span className="truncate max-w-[170px] font-medium">
                {deliveryType === 'TAKE_AWAY'
                  ? 'Retiro: Alsina 350 (B. Blanca)'
                  : (deliveryZoneName || 'Bahía Blanca')}
              </span>
            </div>
          </div>
        </Link>

        {/* Right Action Icons */}
        <div className="flex items-center gap-2">
          <Link
            href="/admin/login"
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant font-medium active:scale-95 transition-all"
            title="Acceso Propietario / KDS"
          >
            <span className="material-symbols-outlined text-[15px] text-primary">lock</span>
            <span className="hidden sm:inline font-headline text-xs font-semibold">Staff</span>
          </Link>

          <a
            href={`https://wa.me/${cleanWhatsapp}?text=Hola%20Yankun%20Sushi%20Lab%20Bah%C3%ADa%20Blanca,%20quisiera%20hacer%20un%20pedido`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-tertiary-container/30 text-tertiary hover:bg-tertiary-container/50 active:scale-95 transition-all"
            aria-label="Atención por WhatsApp Bahía Blanca"
          >
            <span className="material-symbols-outlined text-[18px]">chat</span>
          </a>
        </div>
      </div>
    </header>
  );
}
