'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/admin/auth');
        if (res.ok) {
          const data = await res.json();
          setUserRole(data.user?.role || '');
        }
      } catch (e) {
        // Handled by middleware
      }
    }
    if (pathname !== '/admin/login') {
      checkAuth();
    }
  }, [pathname]);

  // If on login page, render clean full page without sidebar
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  // Si el usuario es COCINERO, solo ve la pantalla de cocina
  const allNavLinks = [
    { label: 'Dashboard CRM', href: '/admin/dashboard', icon: 'dashboard', roles: ['SUPERADMIN', 'ADMIN_LOCAL'] },
    { label: 'Cocina KDS en Vivo', href: '/admin/cocina', icon: 'skillet', roles: ['SUPERADMIN', 'ADMIN_LOCAL', 'COCINERO'] },
    { label: 'Catálogo & Escandallo', href: '/admin/catalogo', icon: 'menu_book', roles: ['SUPERADMIN', 'ADMIN_LOCAL'] },
    { label: 'Zonas de Reparto', href: '/admin/zonas-envio', icon: 'map', roles: ['SUPERADMIN', 'ADMIN_LOCAL'] },
    { label: 'Bandeja Omnicanal', href: '/admin/omnicanal', icon: 'forum', roles: ['SUPERADMIN', 'ADMIN_LOCAL'] },
    { label: 'Bot IA Shokunin', href: '/admin/bot-ia', icon: 'smart_toy', roles: ['SUPERADMIN', 'ADMIN_LOCAL'] },
    { label: 'Configuración General', href: '/admin/configuracion', icon: 'settings', roles: ['SUPERADMIN', 'ADMIN_LOCAL'] },
  ];

  const navLinks = userRole === 'COCINERO'
    ? allNavLinks.filter((l) => l.roles.includes('COCINERO'))
    : allNavLinks;

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth', { method: 'DELETE' });
      router.push('/admin/login');
    } catch {
      router.push('/admin/login');
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col md:flex-row text-on-surface">
      {/* Mobile Top App Bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-inverse-surface text-on-primary sticky top-0 z-40 border-b border-secondary/20 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center font-bold text-xs text-white">
            鮨
          </div>
          <div>
            <span className="font-headline font-bold text-sm">Yankun Admin</span>
            <span className="text-[10px] text-secondary-fixed block -mt-0.5">Bahía Blanca Control</span>
          </div>
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="w-9 h-9 rounded-lg bg-surface-container/20 flex items-center justify-center text-white"
        >
          <span className="material-symbols-outlined text-[20px]">
            {mobileMenuOpen ? 'close' : 'menu'}
          </span>
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/60 pt-16 flex flex-col">
          <div className="bg-inverse-surface p-4 flex-1 overflow-y-auto space-y-2">
            {navLinks.map((link) => {
              const active = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-headline text-xs font-semibold transition-all ${
                    active
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-inverse-on-surface/80 hover:bg-surface-container/10'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">{link.icon}</span>
                  <span>{link.label}</span>
                </Link>
              );
            })}

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-headline text-xs font-semibold text-error hover:bg-error-container/20 transition-all text-left"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-inverse-surface text-inverse-on-surface p-4 border-r border-secondary/20 flex-shrink-0 min-h-screen sticky top-0 h-screen overflow-y-auto">
        {/* Brand */}
        <div className="flex items-center gap-3 pb-6 mb-4 border-b border-surface-container/10 pt-2">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center font-bold text-base text-white shadow-md border border-secondary/40 flex-shrink-0">
            鮨
          </div>
          <div className="min-w-0">
            <h2 className="font-headline font-bold text-sm text-white truncate">
              Yankun Sushi Lab
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
              <span className="text-[10px] font-headline text-secondary-fixed uppercase tracking-wider font-semibold">
                Bahía Blanca {userRole ? `• ${userRole}` : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="space-y-1.5 flex-1">
          {navLinks.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-headline text-xs transition-all ${
                  active
                    ? 'bg-primary text-white font-bold shadow-sm'
                    : 'text-inverse-on-surface/75 hover:bg-surface-container/10 hover:text-white font-medium'
                }`}
              >
                <span
                  className="material-symbols-outlined text-[18px]"
                  style={active ? { fontVariationSettings: "'FILL' 1" } : {}}
                >
                  {link.icon}
                </span>
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer info & Logout */}
        <div className="pt-4 border-t border-surface-container/10 space-y-2">
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-headline font-medium text-inverse-on-surface/70 hover:text-white hover:bg-surface-container/10 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">open_in_new</span>
            <span>Ver Tienda PWA</span>
          </Link>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-headline font-semibold text-error/90 hover:text-error hover:bg-error-container/10 transition-colors text-left"
          >
            <span className="material-symbols-outlined text-[16px]">logout</span>
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
