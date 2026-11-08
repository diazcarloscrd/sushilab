'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface CustomerItem {
  id: string;
  name: string;
  phone: string;
  deliveryAddress?: string;
  ordersCount: number;
  totalSpent: number;
  pointsBalance: number;
  tier: string;
  segment: 'NUEVO' | 'FRECUENTE' | 'VIP' | 'EN_RIESGO' | 'DORMIDO';
  allergies?: string;
  marketingConsent: boolean;
  lastOrderAt?: string;
}

export default function AdminClientesPage() {
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSegment, setSelectedSegment] = useState<string>('ALL');
  const [marketingOnly, setMarketingOnly] = useState(false);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (selectedSegment !== 'ALL') params.set('segment', selectedSegment);
      if (marketingOnly) params.set('marketingOnly', 'true');

      const res = await fetch(`/api/admin/customers?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers || []);
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [selectedSegment, marketingOnly]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCustomers();
  };

  const exportCsv = () => {
    if (customers.length === 0) return;
    const headers = ['Nombre', 'Teléfono', 'Segmento', 'Nivel', 'Pedidos', 'Gasto Total', 'Puntos', 'Consentimiento WhatsApp'];
    const rows = customers.map((c) => [
      `"${c.name}"`,
      `"${c.phone}"`,
      c.segment || 'NUEVO',
      c.tier || 'BRONCE',
      c.ordersCount || 0,
      c.totalSpent || 0,
      c.pointsBalance || 0,
      c.marketingConsent ? 'SI' : 'NO',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `clientes_yankun_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-headline font-bold text-2xl text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[28px]">group</span>
            CRM de Clientes & Segmentación RFM
          </h1>
          <p className="text-xs text-on-surface-variant mt-1">
            Ficha 360°, control de alergias, fidelidad y segmentos automáticos para Yankun Sushi Lab.
          </p>
        </div>

        <button
          onClick={exportCsv}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-container border border-outline-variant/60 font-headline text-xs font-semibold text-on-surface hover:bg-surface-container-high transition-all self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-[18px]">download</span>
          <span>Exportar CSV</span>
        </button>
      </div>

      {/* Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-container p-3 rounded-2xl border border-outline-variant/40">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o teléfono de Bahía Blanca..."
            className="w-full max-w-sm px-3.5 py-2 text-xs rounded-xl bg-surface border border-outline-variant/60 focus:outline-none focus:border-primary"
          />
          <button
            type="submit"
            className="px-3.5 py-2 rounded-xl bg-primary text-white text-xs font-bold font-headline"
          >
            Buscar
          </button>
        </form>

        <div className="flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-1.5 text-xs text-on-surface cursor-pointer select-none">
            <input
              type="checkbox"
              checked={marketingOnly}
              onChange={(e) => setMarketingOnly(e.target.checked)}
              className="rounded text-primary focus:ring-0"
            />
            <span>Solo con consentimiento WhatsApp</span>
          </label>
        </div>
      </div>

      {/* Chips de Segmentos */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { key: 'ALL', label: 'Todos los Clientes' },
          { key: 'VIP', label: '⭐ VIP (Top Compras)' },
          { key: 'FRECUENTE', label: 'Frecuentes' },
          { key: 'NUEVO', label: 'Nuevos' },
          { key: 'EN_RIESGO', label: 'En Riesgo (>30d)' },
          { key: 'DORMIDO', label: 'Dormidos (>60d)' },
        ].map((seg) => (
          <button
            key={seg.key}
            onClick={() => setSelectedSegment(seg.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-headline font-semibold transition-all whitespace-nowrap ${
              selectedSegment === seg.key
                ? 'bg-primary text-white shadow-sm'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            {seg.label}
          </button>
        ))}
      </div>

      {/* Tabla de Clientes */}
      {loading ? (
        <div className="p-12 text-center text-xs text-on-surface-variant">Cargando base de clientes...</div>
      ) : (
        <div className="bg-surface-container rounded-2xl border border-outline-variant/40 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-on-surface">
              <thead className="bg-surface-container-high/60 border-b border-outline-variant/30 font-headline uppercase text-[10px] text-on-surface-variant font-bold">
                <tr>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-3">Segmento RFM</th>
                  <th className="py-3 px-3 text-center">Nivel Puntos</th>
                  <th className="py-3 px-3 text-right">Pedidos</th>
                  <th className="py-3 px-3 text-right">Gasto Histórico</th>
                  <th className="py-3 px-3 text-right">Puntos Disp.</th>
                  <th className="py-3 px-4 text-center">Ficha 360°</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-on-surface-variant text-xs">
                      No se encontraron clientes con los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  customers.map((c) => (
                    <tr key={c.id} className="hover:bg-surface-container-high/30 transition-colors">
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-headline font-bold text-on-surface flex items-center gap-1.5">
                            <span>{c.name}</span>
                            {c.allergies && (
                              <span className="text-[9px] bg-error-container text-error px-1.5 py-0.2 rounded-full font-bold">
                                Alergia
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-on-surface-variant font-mono">{c.phone}</div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            c.segment === 'VIP'
                              ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                              : c.segment === 'FRECUENTE'
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : c.segment === 'EN_RIESGO'
                              ? 'bg-tertiary-container/30 text-tertiary'
                              : c.segment === 'DORMIDO'
                              ? 'bg-error/15 text-error'
                              : 'bg-surface-container-highest text-on-surface-variant'
                          }`}
                        >
                          {c.segment || 'NUEVO'}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container">
                          {c.tier || 'BRONCE'}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right font-headline font-bold">
                        {c.ordersCount || 0}
                      </td>

                      <td className="py-3 px-3 text-right font-headline font-bold text-primary">
                        ${(c.totalSpent || 0).toLocaleString('es-AR')}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-tertiary">
                        {c.pointsBalance || 0} pts
                      </td>

                      <td className="py-3 px-4 text-center">
                        <Link
                          href={`/admin/clientes/${c.id}`}
                          className="w-8 h-8 rounded-lg bg-surface-container-high hover:bg-surface-container-highest inline-flex items-center justify-center text-on-surface-variant transition-colors"
                          title="Ver Ficha 360°"
                        >
                          <span className="material-symbols-outlined text-[16px]">visibility</span>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
