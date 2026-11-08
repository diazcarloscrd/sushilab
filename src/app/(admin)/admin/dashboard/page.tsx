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
  const [activeTab, setActiveTab] = useState<'resumen' | 'ventas' | 'food_cost' | 'menu' | 'zonas' | 'clientes'>('resumen');
  const [dateRange, setDateRange] = useState<'today' | '7d' | '30d' | 'month'>('30d');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [storeOpen, setStoreOpen] = useState(true);

  // Estados de reportes avanzados
  const [reportData, setReportData] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState(false);

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

  // Cargar reporte correspondiente a la pestaña activa y rango seleccionado
  const loadActiveReport = useCallback(async () => {
    if (activeTab === 'resumen') return;
    setLoadingReport(true);

    const now = new Date();
    let fromDate: Date;

    if (dateRange === 'today') {
      fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (dateRange === '7d') {
      fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (dateRange === 'month') {
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    try {
      const res = await fetch(
        `/api/admin/reports?tab=${activeTab}&from=${fromDate.toISOString()}&to=${now.toISOString()}`
      );
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
      }
    } catch (e) {
      console.error('Error loading report:', e);
    } finally {
      setLoadingReport(false);
    }
  }, [activeTab, dateRange]);

  useEffect(() => {
    loadActiveReport();
  }, [loadActiveReport]);

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

  const handleExportCSV = (filename: string, headers: string, rows: string[]) => {
    const content = headers + '\n' + rows.join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
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
            Bahía Blanca • Visión Operativa Shokunin & ERP
          </span>
          <h1 className="font-headline font-bold text-2xl text-on-surface mt-0.5">
            Dashboard CRM & Reportes ERP
          </h1>
          <p className="text-xs text-on-surface-variant">
            Métricas netas en vivo, control de existencias, food cost e ingeniería de menú
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
        </div>
      </div>

      {/* Sub-tabs & Date Range Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-outline-variant/30 pb-3">
        {/* Chips de Pestaña */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'resumen', label: 'Resumen en Vivo', icon: 'dashboard' },
            { id: 'ventas', label: 'Ventas & Canales', icon: 'payments' },
            { id: 'food_cost', label: 'Food Cost & Escandallo', icon: 'lunch_dining' },
            { id: 'menu', label: 'Ingeniería de Menú', icon: 'grid_view' },
            { id: 'zonas', label: 'Rentabilidad Zonas', icon: 'local_shipping' },
            { id: 'clientes', label: 'Clientes & CRM', icon: 'group' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-headline font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Selector de Rango Temporal */}
        {activeTab !== 'resumen' && (
          <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-xl border border-outline-variant/30 self-start lg:self-auto">
            {[
              { id: 'today', label: 'Hoy' },
              { id: '7d', label: '7 días' },
              { id: '30d', label: '30 días' },
              { id: 'month', label: 'Mes actual' },
            ].map((r) => (
              <button
                key={r.id}
                onClick={() => setDateRange(r.id as any)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-headline font-bold transition-all ${
                  dateRange === r.id
                    ? 'bg-surface-container-highest text-primary shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* TAB 1: RESUMEN EN VIVO */}
      {activeTab === 'resumen' && (
        <div className="space-y-6">
          {/* Primary KPI Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

            {/* Alertas de Stock Crítico */}
            <div className="lg:col-span-2 bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-error">warning</span>
                  Existencias Críticas (Stock &lt; 5 unidades)
                </h3>
                <Link href="/admin/inventario" className="text-xs text-primary font-bold hover:underline">
                  Ver Inventario Completo →
                </Link>
              </div>

              {metrics?.lowStockProducts && metrics.lowStockProducts.length > 0 ? (
                <div className="divide-y divide-outline-variant/20">
                  {metrics.lowStockProducts.map((p) => (
                    <div key={p.id} className="py-2.5 flex items-center justify-between text-xs">
                      <span className="font-medium text-on-surface">{p.name}</span>
                      <span className="px-2 py-0.5 rounded-full bg-error-container text-error font-bold">
                        {p.stock} disponibles
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-tertiary-container/20 text-tertiary text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  <span>Todos los productos cuentan con existencias óptimas para el turno.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: VENTAS & CANALES */}
      {activeTab === 'ventas' && (
        <div className="space-y-6">
          {loadingReport ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : reportData ? (
            <>
              {/* KPIs de Ventas */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30">
                  <span className="text-xs font-headline font-bold uppercase tracking-wider text-on-surface-variant block">
                    Ventas Período (Netas)
                  </span>
                  <span className="text-2xl font-headline font-extrabold text-primary block mt-2">
                    ${Number(reportData.totalSales || 0).toLocaleString('es-AR')}
                  </span>
                  <span className="text-[10px] text-on-surface-variant mt-1 block">
                    {reportData.ordersCount} comandas exitosas
                  </span>
                </div>

                <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30">
                  <span className="text-xs font-headline font-bold uppercase tracking-wider text-on-surface-variant block">
                    Ticket Promedio
                  </span>
                  <span className="text-2xl font-headline font-extrabold text-on-surface block mt-2">
                    ${Number(reportData.averageTicket || 0).toLocaleString('es-AR')}
                  </span>
                  <span className="text-[10px] text-tertiary font-bold mt-1 block">
                    Promedio por comanda
                  </span>
                </div>

                <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30">
                  <span className="text-xs font-headline font-bold uppercase tracking-wider text-on-surface-variant block">
                    Cancelaciones
                  </span>
                  <span className="text-2xl font-headline font-extrabold text-error block mt-2">
                    {reportData.cancelledCount} comandas
                  </span>
                  <span className="text-[10px] text-error font-medium mt-1 block">
                    Monto perdido: ${Number(reportData.cancelledAmount || 0).toLocaleString('es-AR')}
                  </span>
                </div>
              </div>

              {/* Mezcla de Canales */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30 space-y-4">
                  <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface-variant">
                    Canales: Delivery vs Retiro en Local
                  </h3>

                  <div className="space-y-3">
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between font-headline font-semibold">
                        <span>Delivery a Domicilio ({reportData.channelMix?.deliveryCount || 0})</span>
                        <span className="font-bold text-primary">
                          ${Number(reportData.channelMix?.deliverySales || 0).toLocaleString('es-AR')}
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{
                            width: `${
                              ((reportData.channelMix?.deliverySales || 0) /
                                Math.max(1, reportData.totalSales || 1)) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between font-headline font-semibold">
                        <span>Retiro en Local (Take Away) ({reportData.channelMix?.takeawayCount || 0})</span>
                        <span className="font-bold text-secondary">
                          ${Number(reportData.channelMix?.takeawaySales || 0).toLocaleString('es-AR')}
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden">
                        <div
                          className="h-full bg-secondary"
                          style={{
                            width: `${
                              ((reportData.channelMix?.takeawaySales || 0) /
                                Math.max(1, reportData.totalSales || 1)) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tendencia Diaria de Ventas */}
                <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30 space-y-4">
                  <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface-variant">
                    Evolución Diaria
                  </h3>

                  <div className="h-32 flex items-end gap-1.5 pt-4">
                    {(reportData.dailySales || []).slice(-14).map((d: any) => {
                      const maxDaily = Math.max(
                        ...reportData.dailySales.map((x: any) => x.sales),
                        1
                      );
                      const heightPct = Math.round((d.sales / maxDaily) * 100);
                      return (
                        <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                          <div
                            className="w-full bg-primary/80 group-hover:bg-primary rounded-t transition-all"
                            style={{ height: `${Math.max(8, heightPct)}%` }}
                          />
                          <span className="text-[9px] text-on-surface-variant truncate w-full text-center">
                            {d.date.split('-')[2]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* TAB 3: FOOD COST & ESCANDALLO */}
      {activeTab === 'food_cost' && (
        <div className="space-y-6">
          {loadingReport ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : reportData ? (
            <>
              {/* KPIs de Food Cost */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30">
                  <span className="text-xs font-headline font-bold uppercase tracking-wider text-on-surface-variant block">
                    Food Cost % Global
                  </span>
                  <span className={`text-2xl font-headline font-extrabold block mt-2 ${
                    reportData.overallFoodCostPct > 35
                      ? 'text-error'
                      : reportData.overallFoodCostPct >= 28
                      ? 'text-amber-500'
                      : 'text-tertiary'
                  }`}>
                    {reportData.overallFoodCostPct}%
                  </span>
                  <span className="text-[10px] text-on-surface-variant mt-1 block">
                    Meta óptima: 28% a 32%
                  </span>
                </div>

                <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30">
                  <span className="text-xs font-headline font-bold uppercase tracking-wider text-on-surface-variant block">
                    Costo Teórico Total
                  </span>
                  <span className="text-2xl font-headline font-extrabold text-on-surface block mt-2">
                    ${Number(reportData.totalTheoreticalCost || 0).toLocaleString('es-AR')}
                  </span>
                  <span className="text-[10px] text-on-surface-variant mt-1 block">
                    Consumo según recetas oficiales
                  </span>
                </div>

                <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30">
                  <span className="text-xs font-headline font-bold uppercase tracking-wider text-on-surface-variant block">
                    Margen Bruto Total
                  </span>
                  <span className="text-2xl font-headline font-extrabold text-tertiary block mt-2">
                    ${Number((reportData.totalRevenue || 0) - (reportData.totalTheoreticalCost || 0)).toLocaleString('es-AR')}
                  </span>
                  <span className="text-[10px] text-tertiary font-bold mt-1 block">
                    Ingresos netos de ingredientes
                  </span>
                </div>
              </div>

              {/* Tabla de Food Cost por Producto */}
              <div className="bg-surface-container-lowest rounded-2xl shadow-card border border-outline-variant/30 overflow-hidden">
                <div className="p-4 border-b border-outline-variant/30 flex items-center justify-between">
                  <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface-variant">
                    Desglose por Producto de Carta
                  </h3>
                  <button
                    onClick={() =>
                      handleExportCSV(
                        'food-cost-yankun',
                        'Producto,Unidades,Ingresos,CostoTeorico,Margen,FoodCostPct',
                        (reportData.items || []).map(
                          (i: any) =>
                            `"${i.name}",${i.unitsSold},${i.revenue},${i.theoreticalTotalCost},${i.grossMargin},${i.foodCostPct}%`
                        )
                      )
                    }
                    className="px-3 py-1.5 rounded-xl bg-surface-container text-xs font-headline font-bold text-on-surface hover:bg-surface-container-high transition-all flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[15px]">download</span>
                    <span>Exportar CSV</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-container text-on-surface-variant font-headline font-bold border-b border-outline-variant/30">
                      <tr>
                        <th className="py-3 px-4">Producto</th>
                        <th className="py-3 px-4 text-center">Unidades</th>
                        <th className="py-3 px-4 text-right">Venta Total</th>
                        <th className="py-3 px-4 text-right">Costo Receta</th>
                        <th className="py-3 px-4 text-right">Margen Bruto</th>
                        <th className="py-3 px-4 text-center">Food Cost %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/20">
                      {(reportData.items || []).map((item: any) => (
                        <tr key={item.productId} className="hover:bg-surface-container/30 transition-colors">
                          <td className="py-3 px-4 font-bold text-on-surface">{item.name}</td>
                          <td className="py-3 px-4 text-center">{item.unitsSold}</td>
                          <td className="py-3 px-4 text-right">${item.revenue.toLocaleString('es-AR')}</td>
                          <td className="py-3 px-4 text-right font-mono">${item.theoreticalTotalCost.toLocaleString('es-AR')}</td>
                          <td className="py-3 px-4 text-right font-bold text-tertiary">${item.grossMargin.toLocaleString('es-AR')}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2 py-0.5 rounded-full font-bold ${
                              item.foodCostPct > 35
                                ? 'bg-error-container text-error'
                                : item.foodCostPct >= 28
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-tertiary-container/30 text-tertiary'
                            }`}>
                              {item.foodCostPct}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* TAB 4: INGENIERÍA DE MENÚ (BCG MATRIX) */}
      {activeTab === 'menu' && (
        <div className="space-y-6">
          {loadingReport ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : reportData ? (
            <>
              {/* Resumen de los 4 Cuadrantes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-card border-2 border-tertiary/40">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-tertiary text-[20px]">star</span>
                    <span className="font-headline font-bold text-xs uppercase tracking-wider text-tertiary">
                      Estrellas ({reportData.quadrantCounts?.ESTRELLA || 0})
                    </span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant mt-2">
                    Alta Demanda & Alto Margen. Tus platos insignia que impulsan la rentabilidad.
                  </p>
                </div>

                <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-card border-2 border-primary/40">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">pets</span>
                    <span className="font-headline font-bold text-xs uppercase tracking-wider text-primary">
                      Caballos de Batalla ({reportData.quadrantCounts?.CABALLO || 0})
                    </span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant mt-2">
                    Alta Demanda & Bajo Margen. Ajustar precio o rediseñar receta para ganar más.
                  </p>
                </div>

                <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-card border-2 border-secondary/40">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary text-[20px]">extension</span>
                    <span className="font-headline font-bold text-xs uppercase tracking-wider text-secondary">
                      Puzzles / Enigmas ({reportData.quadrantCounts?.PUZZLE || 0})
                    </span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant mt-2">
                    Baja Demanda & Alto Margen. Necesitan más visibilidad en menú y check-out.
                  </p>
                </div>

                <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-card border-2 border-outline-variant/60">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-outline text-[20px]">inventory_2</span>
                    <span className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface-variant">
                      Perros ({reportData.quadrantCounts?.PERRO || 0})
                    </span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant mt-2">
                    Baja Demanda & Bajo Margen. Candidatos a retiro de carta o reformulación.
                  </p>
                </div>
              </div>

              {/* Lista Detallada de Productos con Cuadrante y Recomendación */}
              <div className="bg-surface-container-lowest rounded-2xl shadow-card border border-outline-variant/30 p-5 space-y-4">
                <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface-variant">
                  Matriz BCG de la Carta
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(reportData.items || []).map((item: any) => (
                    <div
                      key={item.productId}
                      className="p-4 rounded-xl bg-surface-container border border-outline-variant/40 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-headline font-bold text-xs text-on-surface">{item.name}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          item.quadrant === 'ESTRELLA'
                            ? 'bg-tertiary-container/40 text-tertiary'
                            : item.quadrant === 'CABALLO'
                            ? 'bg-primary-container/40 text-primary'
                            : item.quadrant === 'PUZZLE'
                            ? 'bg-secondary-container/40 text-secondary'
                            : 'bg-surface-container-high text-on-surface-variant'
                        }`}>
                          {item.quadrant}
                        </span>
                      </div>

                      <div className="text-[11px] text-on-surface-variant flex items-center justify-between">
                        <span>{item.unitsSold} u. vendidas ({item.popularityPct}% de la carta)</span>
                        <span>Margen unitario: <strong className="text-on-surface">${item.marginPerUnit.toLocaleString('es-AR')}</strong></span>
                      </div>

                      <p className="text-[11px] text-primary/90 italic pt-1 border-t border-outline-variant/20">
                        💡 {item.recommendation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* TAB 5: RENTABILIDAD POR ZONA */}
      {activeTab === 'zonas' && (
        <div className="space-y-6">
          {loadingReport ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : reportData ? (
            <>
              {/* KPIs de Rentabilidad */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30">
                  <span className="text-xs font-headline font-bold uppercase tracking-wider text-on-surface-variant block">
                    Envíos Cobrados a Clientes
                  </span>
                  <span className="text-2xl font-headline font-extrabold text-on-surface block mt-2">
                    ${Number(reportData.totalFeesCollected || 0).toLocaleString('es-AR')}
                  </span>
                </div>

                <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30">
                  <span className="text-xs font-headline font-bold uppercase tracking-wider text-on-surface-variant block">
                    Costo Pagado a Cadetes
                  </span>
                  <span className="text-2xl font-headline font-extrabold text-error block mt-2">
                    ${Number(reportData.totalCourierCosts || 0).toLocaleString('es-AR')}
                  </span>
                </div>

                <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30">
                  <span className="text-xs font-headline font-bold uppercase tracking-wider text-on-surface-variant block">
                    Margen Neto de Delivery
                  </span>
                  <span className={`text-2xl font-headline font-extrabold block mt-2 ${
                    reportData.netDeliveryProfitTotal >= 0 ? 'text-tertiary' : 'text-error'
                  }`}>
                    ${Number(reportData.netDeliveryProfitTotal || 0).toLocaleString('es-AR')}
                  </span>
                </div>
              </div>

              {/* Tabla de Zonas */}
              <div className="bg-surface-container-lowest rounded-2xl shadow-card border border-outline-variant/30 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-container text-on-surface-variant font-headline font-bold border-b border-outline-variant/30">
                      <tr>
                        <th className="py-3 px-4">Zona (Bahía Blanca)</th>
                        <th className="py-3 px-4 text-center">Pedidos</th>
                        <th className="py-3 px-4 text-right">Venta Total</th>
                        <th className="py-3 px-4 text-right">Envío Cobrado</th>
                        <th className="py-3 px-4 text-right">Costo Cadete</th>
                        <th className="py-3 px-4 text-right">Resultado Neto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/20">
                      {(reportData.zones || []).map((zone: any) => (
                        <tr key={zone.zoneId} className="hover:bg-surface-container/30 transition-colors">
                          <td className="py-3 px-4 font-bold text-on-surface">{zone.zoneName}</td>
                          <td className="py-3 px-4 text-center">{zone.ordersCount}</td>
                          <td className="py-3 px-4 text-right">${zone.salesTotal.toLocaleString('es-AR')}</td>
                          <td className="py-3 px-4 text-right">${zone.feesCollected.toLocaleString('es-AR')}</td>
                          <td className="py-3 px-4 text-right font-mono text-error">${zone.courierCosts.toLocaleString('es-AR')}</td>
                          <td className={`py-3 px-4 text-right font-bold ${
                            zone.netDeliveryProfit >= 0 ? 'text-tertiary' : 'text-error'
                          }`}>
                            ${zone.netDeliveryProfit.toLocaleString('es-AR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* TAB 6: CLIENTES & CRM */}
      {activeTab === 'clientes' && (
        <div className="space-y-6">
          {loadingReport ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : reportData ? (
            <>
              {/* KPIs CRM */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30">
                  <span className="text-xs font-headline font-bold uppercase tracking-wider text-on-surface-variant block">
                    Base Total de Comensales
                  </span>
                  <span className="text-2xl font-headline font-extrabold text-on-surface block mt-2">
                    {reportData.totalCustomers} clientes
                  </span>
                  <span className="text-[10px] text-tertiary font-bold mt-1 block">
                    {reportData.returningCustomersCount} recurrentes · {reportData.newCustomersCount} nuevos
                  </span>
                </div>

                <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30">
                  <span className="text-xs font-headline font-bold uppercase tracking-wider text-on-surface-variant block">
                    Puntos en Circulación
                  </span>
                  <span className="text-2xl font-headline font-extrabold text-primary block mt-2">
                    {Number(reportData.activePointsBalance || 0).toLocaleString('es-AR')} pts
                  </span>
                  <span className="text-[10px] text-on-surface-variant mt-1 block">
                    Pasivo exigible: ${Number(reportData.pointsLiabilityARS || 0).toLocaleString('es-AR')}
                  </span>
                </div>

                <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30">
                  <span className="text-xs font-headline font-bold uppercase tracking-wider text-on-surface-variant block">
                    Acceso Rápido al CRM
                  </span>
                  <Link
                    href="/admin/clientes"
                    className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-headline font-bold hover:bg-primary/90 transition-all shadow-sm"
                  >
                    <span>Ver Fichas 360°</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </Link>
                </div>
              </div>

              {/* Segmentos y Niveles */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30 space-y-4">
                  <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface-variant">
                    Distribución por Segmentos RFM
                  </h3>

                  <div className="space-y-2">
                    {Object.entries(reportData.segmentCounts || {}).map(([seg, count]: any) => (
                      <div key={seg} className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container text-xs">
                        <span className="font-bold text-on-surface">{seg}</span>
                        <span className="px-2 py-0.5 rounded-full bg-surface-container-high font-mono font-bold text-primary">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30 space-y-4">
                  <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface-variant">
                    Niveles Yankun Club
                  </h3>

                  <div className="space-y-2">
                    {Object.entries(reportData.tierCounts || {}).map(([tier, count]: any) => (
                      <div key={tier} className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container text-xs">
                        <span className="font-bold text-on-surface">{tier}</span>
                        <span className="px-2 py-0.5 rounded-full bg-surface-container-high font-mono font-bold text-secondary">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
