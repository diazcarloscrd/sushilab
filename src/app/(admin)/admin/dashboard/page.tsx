'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface DashboardStats {
  todaySales: number;
  activeOrdersCount: number;
  averageTicket: number;
  customersCount: number;
  orders: any[];
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    todaySales: 0,
    activeOrdersCount: 0,
    averageTicket: 0,
    customersCount: 0,
    orders: [],
  });
  const [loading, setLoading] = useState(true);
  const [storeOpen, setStoreOpen] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/orders');
        if (res.ok) {
          const orders = await res.json();
          const today = new Date().toDateString();

          const todayOrders = orders.filter(
            (o: any) => new Date(o.createdAt).toDateString() === today
          );

          const todaySales = todayOrders.reduce((sum: number, o: any) => sum + (o.total || 0), 0);
          const activeOrders = orders.filter(
            (o: any) => o.status === 'CREADO' || o.status === 'EN_COCINA' || o.status === 'EN_CAMINO'
          );
          const avgTicket = todayOrders.length > 0 ? Math.round(todaySales / todayOrders.length) : (orders.length > 0 ? Math.round(orders.reduce((sum: number, o: any) => sum + o.total, 0) / orders.length) : 0);

          setStats({
            todaySales,
            activeOrdersCount: activeOrders.length,
            averageTicket: avgTicket,
            customersCount: orders.length,
            orders: orders.slice(0, 8),
          });
        }
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleExportCSV = () => {
    if (stats.orders.length === 0) return;
    const headers = 'ID,Orden,Cliente,Telefono,Tipo,Total,Estado,Fecha\n';
    const rows = stats.orders
      .map(
        (o) =>
          `"${o.id}","${o.orderNumber}","${o.customerName}","${o.customerPhone}","${o.deliveryType}","${o.total}","${o.status}","${o.createdAt}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `comandas-yankun-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Header with Title and Quick Toggles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-outline-variant/30">
        <div>
          <span className="font-headline text-xs uppercase tracking-wider text-secondary font-bold">
            Visión Operativa Shokunin
          </span>
          <h1 className="font-headline font-bold text-2xl text-on-surface mt-0.5">
            Panel de Control & CRM
          </h1>
          <p className="text-xs text-on-surface-variant">
            Monitoreo en vivo de ventas, cocina, comensales y métricas de despacho.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-3">
          {/* Store status switch */}
          <button
            onClick={() => setStoreOpen(!storeOpen)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-headline font-bold transition-all ${
              storeOpen
                ? 'bg-tertiary-container/30 text-tertiary border border-tertiary/40'
                : 'bg-error-container text-on-error-container'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${storeOpen ? 'bg-tertiary animate-pulse' : 'bg-error'}`}
            />
            <span>{storeOpen ? 'Local Abierto' : 'Local Cerrado'}</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-headline text-xs font-semibold border border-outline-variant/30 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            <span>Exportar CSV</span>
          </button>

          {/* Direct KDS button */}
          <Link
            href="/admin/cocina"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary-container text-white font-headline text-xs font-bold shadow-sm transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[16px]">skillet</span>
            <span>Ir al KDS</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Ventas Hoy */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30 space-y-2">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-xs font-headline font-semibold">Ventas del Día</span>
            <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">payments</span>
            </span>
          </div>
          <div className="font-headline font-extrabold text-2xl text-on-surface">
            ${stats.todaySales.toLocaleString('es-AR')}
          </div>
          <p className="text-[11px] text-tertiary font-medium flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">trending_up</span>
            <span>Facturación en tiempo real</span>
          </p>
        </div>

        {/* Card 2: Órdenes Activas */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30 space-y-2">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-xs font-headline font-semibold">Órdenes en Curso</span>
            <span className="w-8 h-8 rounded-full bg-secondary/15 text-secondary flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">skillet</span>
            </span>
          </div>
          <div className="font-headline font-extrabold text-2xl text-on-surface">
            {stats.activeOrdersCount}
          </div>
          <p className="text-[11px] text-secondary font-medium flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">timelapse</span>
            <span>En cola de cocina o viaje</span>
          </p>
        </div>

        {/* Card 3: Ticket Promedio */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30 space-y-2">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-xs font-headline font-semibold">Ticket Promedio</span>
            <span className="w-8 h-8 rounded-full bg-tertiary/15 text-tertiary flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">receipt_long</span>
            </span>
          </div>
          <div className="font-headline font-extrabold text-2xl text-on-surface">
            ${stats.averageTicket.toLocaleString('es-AR')}
          </div>
          <p className="text-[11px] text-on-surface-variant font-medium">
            Promedio por comensal
          </p>
        </div>

        {/* Card 4: Clientes Fidelizados */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30 space-y-2">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-xs font-headline font-semibold">Comensales Registrados</span>
            <span className="w-8 h-8 rounded-full bg-inverse-surface/10 text-on-surface flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">group</span>
            </span>
          </div>
          <div className="font-headline font-extrabold text-2xl text-on-surface">
            {stats.customersCount}
          </div>
          <p className="text-[11px] text-on-surface-variant font-medium">
            Perfiles con historial en CRM
          </p>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-headline font-bold text-base text-on-surface">
            Últimas Comandas Registradas
          </h3>
          <Link
            href="/admin/cocina"
            className="text-xs font-headline font-bold text-primary hover:underline flex items-center gap-1"
          >
            <span>Ver Tablero Kanban Completo</span>
            <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
          </Link>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-on-surface-variant">
            Cargando comandas recientes...
          </div>
        ) : stats.orders.length === 0 ? (
          <div className="py-8 text-center text-xs text-on-surface-variant">
            No se han registrado pedidos todavía.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-outline-variant/20 text-on-surface-variant font-headline font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Comanda</th>
                  <th className="py-2.5 px-3">Cliente</th>
                  <th className="py-2.5 px-3">Tipo</th>
                  <th className="py-2.5 px-3">Total</th>
                  <th className="py-2.5 px-3">Pago</th>
                  <th className="py-2.5 px-3">Estado</th>
                  <th className="py-2.5 px-3">Hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/15 text-on-surface">
                {stats.orders.map((o) => (
                  <tr key={o.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="py-3 px-3 font-headline font-bold text-primary">
                      #{o.orderNumber}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-medium">{o.customerName}</div>
                      <div className="text-[10px] text-on-surface-variant">{o.customerPhone}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-headline font-semibold bg-surface-container">
                        {o.deliveryType === 'TAKE_AWAY' ? 'Retiro' : 'Delivery'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-headline font-bold">
                      ${o.total.toLocaleString('es-AR')}
                    </td>
                    <td className="py-3 px-3 text-[11px]">
                      {o.paymentMethod}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-headline font-bold ${
                          o.status === 'CREADO'
                            ? 'bg-primary/10 text-primary'
                            : o.status === 'EN_COCINA'
                            ? 'bg-secondary/15 text-secondary'
                            : o.status === 'EN_CAMINO'
                            ? 'bg-tertiary-container/30 text-tertiary'
                            : 'bg-surface-container text-on-surface-variant'
                        }`}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-on-surface-variant text-[11px]">
                      {new Date(o.createdAt).toLocaleTimeString('es-AR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
