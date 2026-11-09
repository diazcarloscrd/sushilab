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
  whatsappMessageTemplate?: string;
  instagramUrl?: string;
  kitchenEstimatedMinutes?: number;
  announcementBanner?: string;
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
    kitchenEstimatedMinutes: 35,
    announcementBanner: '',
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

  const cleanWhatsapp = (storeInfo.whatsapp || '+5492915556677').replace(/[^0-9]/g, '');
  const encodedMsg = encodeURIComponent(
    storeInfo.whatsappMessageTemplate || 'Hola Yankun Sushi Lab Bahía Blanca, quisiera hacer una consulta sobre mi pedido'
  );

  return (
    <header className="fixed top-0 w-full z-40 pt-safe bg-surface/90 backdrop-blur-xl border-b border-outline-variant/30 shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
      {/* Dynamic Announcement Banner if configured by client */}
      {storeInfo.announcementBanner && (
        <div className="bg-primary text-white text-[11px] font-headline font-semibold py-1 px-4 text-center tracking-wide overflow-hidden whitespace-nowrap text-ellipsis flex items-center justify-center gap-1.5 shadow-inner">
          <span className="material-symbols-outlined text-[14px]">campaign</span>
          <span>{storeInfo.announcementBanner}</span>
        </div>
      )}

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
            <div className="flex items-center gap-1.5 text-on-surface-variant text-xs">
              <span className="material-symbols-outlined text-primary text-[13px]">location_on</span>
              <span className="truncate max-w-[140px] sm:max-w-[200px] font-medium">
                {deliveryType === 'TAKE_AWAY'
                  ? 'Retiro: Alsina 350 (B. Blanca)'
                  : (deliveryZoneName && !deliveryZoneName.toLowerCase().includes('macrocentro')
                      ? (deliveryZoneName.includes('Bahía Blanca') ? deliveryZoneName : `${deliveryZoneName} — B. Blanca`)
                      : 'Bahía Blanca')}
              </span>

              {storeInfo.kitchenEstimatedMinutes && storeInfo.isOpen && (
                <span className="hidden sm:inline-flex items-center gap-0.5 text-[10px] bg-surface-container px-1.5 py-0.5 rounded-md text-on-surface font-semibold">
                  <span className="material-symbols-outlined text-[11px] text-tertiary">timer</span>
                  <span>~{storeInfo.kitchenEstimatedMinutes}m</span>
                </span>
              )}
            </div>
          </div>
        </Link>

        {/* Right Action Icons */}
        <div className="flex items-center gap-2">
          {storeInfo.instagramUrl && (
            <a
              href={storeInfo.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
              title="Instagram Oficial"
              aria-label="Instagram Oficial"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </a>
          )}

          <a
            href={`https://wa.me/${cleanWhatsapp}?text=${encodedMsg}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-tertiary-container/30 text-tertiary hover:bg-tertiary-container/50 active:scale-95 transition-all text-xs font-headline font-semibold"
            aria-label="Atención por WhatsApp Bahía Blanca"
          >
            <span className="material-symbols-outlined text-[17px]">chat</span>
            <span className="hidden sm:inline">WhatsApp</span>
          </a>
        </div>
      </div>
    </header>
  );
}
