'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

interface DashboardMetrics {
  todaySales: number;
  activeOrdersCount: number;
  averageTicket: number;
  customersCount: number;
  totalOrdersCount: number;
  cancelledOrdersCount: number;
  paymentBreakdown: Record<string, { count: number; total: number }>;
  channelBreakdown: { delivery: number; takeAway: number };
  lowStockProducts: Array<{ id: string; name: string; stock: number; active: boolean }>;
}

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [storeOpen, setStoreOpen] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [metricsRes, settingsRes] = await Promise.all([
        fetch('/api/admin/metrics'),
        fetch('/api/settings/public'),
      ]);

      if (metricsRes.ok) {
        const data = await metricsRes.json();
        setMetrics(data.metrics);
        setRecentOrders(data.recentOrders || []);
      }

      if (settingsRes.ok) {
        const sData = await settingsRes.json();
        setStoreOpen(sData.isOpen);
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleStore = async () => {
    const nextState = !storeOpen;
    setStoreOpen(nextState);
    try {
      await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: [{ key: 'STORE_IS_OPEN', value: nextState ? 'true' : 'false' }] }),
      });
    } catch (e) {
      console.error('Error actualizando switch local:', e);
    }
  };

  const handleExportCSV = () => {
    if (recentOrders.length === 0) return;
    const headers = 'ID,Orden,Cliente,Telefono,Tipo,Total,Estado,Pago,Fecha\n';
    const rows = recentOrders
      .map(
        (o) =>
          `"${o.id}","${o.orderNumber}","${o.customerName}","${o.customerPhone}","${o.deliveryType}","${o.total}","${o.status}","${o.paymentMethod}","${o.createdAt}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `comandas-yankun-bbla-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Title and Quick Toggles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-outline-variant/30">
        <div>
          <span className="font-headline text-xs uppercase tracking-wider text-secondary font-bold">
            Bahía Blanca • Visión Operativa Shokunin
          </span>
          <h1 className="font-headline font-bold text-2xl text-on-surface mt-0.5">
            Panel de Control & CRM
          </h1>
          <p className="text-xs text-on-surface-variant">
            Métricas netas en vivo, control de existencias y comensales únicos reales.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick Store Open Toggle */}
          <div className="flex items-center gap-2 bg-surface-container-low px-3 py-2 rounded-xl border border-outline-variant/30">
            <span className="text-xs font-headline font-bold">
              {storeOpen ? 'Local Abierto' : 'Local Cerrado'}
            </span>
            <button
              onClick={handleToggleStore}
              className={`w-9 h-5 rounded-full transition-colors relative flex items-center p-0.5 ${
                storeOpen ? 'bg-primary' : 'bg-outline-variant'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  storeOpen ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-headline font-semibold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Ventas Netas de Hoy */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface-variant">
              Ventas Hoy (Netas)
            </span>
            <span className="material-symbols-outlined text-primary text-[20px]">payments</span>
          </div>
          <div className="mt-3">
            <span className="font-headline font-extrabold text-2xl text-on-surface block">
              ${(metrics?.todaySales || 0).toLocaleString('es-AR')}
            </span>
            <span className="text-[10px] text-tertiary font-bold flex items-center gap-1 mt-1">
              ✓ Excluye pedidos cancelados
            </span>
          </div>
        </div>

        {/* Comandas Activas en Cocina */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface-variant">
              En Cocina / Despacho
            </span>
            <span className="material-symbols-outlined text-secondary text-[20px]">skillet</span>
          </div>
          <div className="mt-3">
            <span className="font-headline font-extrabold text-2xl text-on-surface block">
              {metrics?.activeOrdersCount || 0}
            </span>
            <Link
              href="/admin/cocina"
              className="text-[10px] text-primary font-bold hover:underline inline-block mt-1"
            >
              Ver KDS en Vivo →
            </Link>
          </div>
        </div>

        {/* Ticket Promedio Real */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface-variant">
              Ticket Promedio
            </span>
            <span className="material-symbols-outlined text-tertiary text-[20px]">receipt</span>
          </div>
          <div className="mt-3">
            <span className="font-headline font-extrabold text-2xl text-on-surface block">
              ${(metrics?.averageTicket || 0).toLocaleString('es-AR')}
            </span>
            <span className="text-[10px] text-on-surface-variant font-medium block mt-1">
              Por comanda confirmada
            </span>
          </div>
        </div>

        {/* Clientes Únicos Reales */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface-variant">
              Comensales Únicos
            </span>
            <span className="material-symbols-outlined text-on-surface-variant text-[20px]">group</span>
          </div>
          <div className="mt-3">
            <span className="font-headline font-extrabold text-2xl text-on-surface block">
              {metrics?.customersCount || 0}
            </span>
            <span className="text-[10px] text-on-surface-variant font-medium block mt-1">
              Teléfonos registrados en base
            </span>
          </div>
        </div>
      </div>

      {/* Secondary Insights Grid: Medios de Pago & Stock Bajo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Medios de Pago */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30 space-y-4">
          <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-primary">account_balance_wallet</span>
            Mezcla de Medios de Pago
          </h3>

          <div className="space-y-3">
            {[
              { label: 'Mercado Pago', key: 'MERCADO_PAGO', color: 'bg-primary' },
              { label: 'Transferencia Bancaria', key: 'TRANSFERENCIA', color: 'bg-secondary' },
              { label: 'Efectivo en Entrega', key: 'EFECTIVO', color: 'bg-tertiary' },
            ].map((pm) => {
              const data = metrics?.paymentBreakdown[pm.key] || { count: 0, total: 0 };
              return (
                <div key={pm.key} className="space-y-1 text-xs">
                  <div className="flex justify-between font-headline font-semibold">
                    <span>{pm.label} ({data.count})</span>
                    <span className="font-bold">${data.total.toLocaleString('es-AR')}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden">
                    <div
                      className={`h-full ${pm.color}`}
                      style={{
                        width: `${Math.min(100, (data.total / Math.max(1, metrics?.todaySales || data.total)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Desglose por Canal */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30 space-y-4">
          <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-secondary">local_shipping</span>
            Canales de Entrega
          </h3>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-4 rounded-xl bg-surface-container text-center space-y-1">
              <span className="material-symbols-outlined text-primary text-2xl">moped</span>
              <span className="font-headline font-extrabold text-xl text-on-surface block">
                {metrics?.channelBreakdown.delivery || 0}
              </span>
              <span className="text-[11px] text-on-surface-variant font-semibold">
                Delivery Bahía Blanca
              </span>
            </div>

            <div className="p-4 rounded-xl bg-surface-container text-center space-y-1">
              <span className="material-symbols-outlined text-secondary text-2xl">storefront</span>
              <span className="font-headline font-extrabold text-xl text-on-surface block">
                {metrics?.channelBreakdown.takeAway || 0}
              </span>
              <span className="text-[11px] text-on-surface-variant font-semibold">
                Retiro en Local (Alsina)
              </span>
            </div>
          </div>
        </div>

        {/* Alerta de Existencias Bajas */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30 space-y-3">
          <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-error">inventory_2</span>
            Alerta de Existencias Bajas
          </h3>

          {metrics?.lowStockProducts && metrics.lowStockProducts.length > 0 ? (
            <div className="space-y-2">
              {metrics.lowStockProducts.slice(0, 4).map((p) => (
                <div
                  key={p.id}
                  className="p-2.5 rounded-xl bg-surface-container flex items-center justify-between text-xs"
                >
                  <span className="font-headline font-bold text-on-surface truncate pr-2">
                    {p.name}
                  </span>
                  <span
                    className={`font-mono text-xs font-bold px-2 py-0.5 rounded-full ${
                      p.stock === 0
                        ? 'bg-error-container text-error'
                        : 'bg-secondary-container text-on-secondary-container'
                    }`}
                  >
                    {p.stock === 0 ? 'AGOTADO' : `${p.stock} un.`}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-on-surface-variant">
              ✓ Todos los rolls cuentan con stock suficiente para el turno.
            </div>
          )}
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="bg-surface-container-lowest rounded-2xl shadow-card border border-outline-variant/30 overflow-hidden">
        <div className="p-5 border-b border-outline-variant/20 flex items-center justify-between">
          <h3 className="font-headline font-bold text-sm text-on-surface">
            Últimas Comandas Registradas
          </h3>
          <Link
            href="/admin/cocina"
            className="text-xs text-primary font-headline font-bold hover:underline"
          >
            Abrir Cocina KDS →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-container-low text-on-surface-variant font-headline font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3.5"># Comanda</th>
                <th className="p-3.5">Cliente</th>
                <th className="p-3.5">Canal</th>
                <th className="p-3.5">Total</th>
                <th className="p-3.5">Estado</th>
                <th className="p-3.5">Pago</th>
                <th className="p-3.5">Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/15">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-on-surface-variant">
                    Sin pedidos registrados todavía.
                  </td>
                </tr>
              ) : (
                recentOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-surface-container/30 transition-colors">
                    <td className="p-3.5 font-headline font-bold text-on-surface">
                      #{o.orderNumber}
                    </td>
                    <td className="p-3.5">
                      <span className="font-semibold block">{o.customerName}</span>
                      <span className="text-[10px] text-on-surface-variant">{o.customerPhone}</span>
                    </td>
                    <td className="p-3.5">
                      <span className="text-[11px] font-medium">
                        {o.deliveryType === 'TAKE_AWAY' ? 'Retiro Local' : 'Delivery'}
                      </span>
                    </td>
                    <td className="p-3.5 font-headline font-bold text-primary">
                      ${(o.total || 0).toLocaleString('es-AR')}
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`text-[10px] font-headline font-bold px-2 py-0.5 rounded-full ${
                          o.status === 'ENTREGADO'
                            ? 'bg-tertiary-container/40 text-tertiary'
                            : o.status === 'CANCELADO'
                            ? 'bg-error-container text-error'
                            : 'bg-primary-container text-on-primary-container'
                        }`}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className="text-[11px] font-medium">
                        {o.paymentMethod} ({o.paymentStatus})
                      </span>
                    </td>
                    <td className="p-3.5 text-on-surface-variant text-[11px]">
                      {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
