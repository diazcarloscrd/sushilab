'use client';

import React, { useState, useEffect } from 'react';

interface Ingredient {
  id: string;
  name: string;
  kind: 'RAW' | 'PREP' | 'PACKAGING';
  baseUnit: string;
  purchaseUnit?: string;
  costPerBaseUnit: number;
  stockQty: number;
  minStock: number;
  tracksBatches: boolean;
  isCritical: boolean;
  prepOutputQty?: number;
  prepYieldPct?: number;
  active: boolean;
  supplier?: { id: string; name: string };
}

interface StockBatch {
  id: string;
  code: string;
  qtyRemaining: number;
  unitCost: number;
  expiresAt?: string;
  receivedAt: string;
  ingredient?: { name: string; baseUnit: string };
}

interface StockMovement {
  id: string;
  type: string;
  qty: number;
  unitCost: number;
  reason?: string;
  userName?: string;
  createdAt: string;
  ingredient?: { name: string; baseUnit: string };
}

export default function AdminInventarioPage() {
  const [activeTab, setActiveTab] = useState<'STOCK' | 'LOTES' | 'MOVIMIENTOS' | 'PRODUCCION' | 'MERMA'>('STOCK');
  const [loading, setLoading] = useState(true);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [batches, setBatches] = useState<StockBatch[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);

  // Modal de Producción
  const [produceModalOpen, setProduceModalOpen] = useState(false);
  const [selectedPrepId, setSelectedPrepId] = useState('');
  const [batchesCount, setBatchesCount] = useState(1);
  const [producing, setProducing] = useState(false);

  // Modal de Merma
  const [wasteModalOpen, setWasteModalOpen] = useState(false);
  const [wasteIngredientId, setWasteIngredientId] = useState('');
  const [wasteQty, setWasteQty] = useState('');
  const [wasteReason, setWasteReason] = useState('Merma en mise en place');
  const [savingWaste, setSavingWaste] = useState(false);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/inventory');
      if (res.ok) {
        const data = await res.json();
        setIngredients(data.ingredients || []);
        setBatches(data.batches || []);
        setMovements(data.movements || []);
        setAlerts(data.alerts || []);
      }
    } catch (err) {
      console.error('Error fetching inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleProduce = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPrepId) return;
    try {
      setProducing(true);
      const res = await fetch('/api/admin/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'PRODUCE',
          prepIngredientId: selectedPrepId,
          batchesCount,
        }),
      });
      if (res.ok) {
        setProduceModalOpen(false);
        fetchInventory();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProducing(false);
    }
  };

  const handleWaste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wasteIngredientId || !wasteQty) return;
    try {
      setSavingWaste(true);
      const res = await fetch('/api/admin/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'WASTE',
          ingredientId: wasteIngredientId,
          qty: Number(wasteQty),
          reason: wasteReason,
        }),
      });
      if (res.ok) {
        setWasteModalOpen(false);
        setWasteQty('');
        fetchInventory();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingWaste(false);
    }
  };

  const formatQty = (qty: number, unit: string) => {
    if (unit === 'G' && qty >= 1000) {
      return `${(qty / 1000).toLocaleString('es-AR', { maximumFractionDigits: 2 })} kg`;
    }
    if (unit === 'ML' && qty >= 1000) {
      return `${(qty / 1000).toLocaleString('es-AR', { maximumFractionDigits: 2 })} L`;
    }
    return `${qty.toLocaleString('es-AR')} ${unit.toLowerCase()}`;
  };

  const prepIngredients = ingredients.filter((i) => i.kind === 'PREP');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-headline font-bold text-2xl text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[28px]">inventory_2</span>
            Control de Insumos & Escandallo ERP
          </h1>
          <p className="text-xs text-on-surface-variant mt-1">
            Gestión de stock en tiempo real, lotes FEFO, merma y producción para Yankun Sushi Lab.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setProduceModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-primary text-white font-headline text-xs font-bold shadow-sm hover:bg-primary-container transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">skillet</span>
            <span>Producir Tanda</span>
          </button>
          <button
            onClick={() => setWasteModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-container border border-outline-variant/60 font-headline text-xs font-semibold text-on-surface hover:bg-surface-container-high transition-all"
          >
            <span className="material-symbols-outlined text-[18px] text-error">delete_outline</span>
            <span>Registrar Merma</span>
          </button>
        </div>
      </div>

      {/* Alertas destacadas */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((al, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                al.severity === 'error'
                  ? 'bg-error-container/20 border-error/40 text-error'
                  : 'bg-tertiary-container/20 border-tertiary/40 text-tertiary'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">
                  {al.severity === 'error' ? 'warning' : 'info'}
                </span>
                <span className="font-bold">{al.title}:</span>
                <span>{al.message}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Navegación por Pestañas */}
      <div className="flex items-center gap-2 border-b border-outline-variant/30 pb-2 overflow-x-auto">
        {[
          { key: 'STOCK', label: 'Stock & Insumos', icon: 'view_list' },
          { key: 'LOTES', label: 'Lotes & Vencimientos', icon: 'schedule' },
          { key: 'MOVIMIENTOS', label: 'Historial Movimientos', icon: 'history' },
          { key: 'PRODUCCION', label: 'Producción de Shari/Prep', icon: 'skillet' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-headline font-semibold transition-all ${
              activeTab === tab.key
                ? 'bg-primary text-white shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Contenido según pestaña */}
      {loading ? (
        <div className="p-12 text-center text-xs text-on-surface-variant">
          Cargando inventario de insumos...
        </div>
      ) : activeTab === 'STOCK' ? (
        <div className="bg-surface-container rounded-2xl border border-outline-variant/40 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-on-surface">
              <thead className="bg-surface-container-high/60 border-b border-outline-variant/30 font-headline uppercase text-[10px] text-on-surface-variant font-bold">
                <tr>
                  <th className="py-3 px-4">Insumo / Materia Prima</th>
                  <th className="py-3 px-3">Tipo</th>
                  <th className="py-3 px-3 text-right">Stock Actual</th>
                  <th className="py-3 px-3 text-right">Mínimo</th>
                  <th className="py-3 px-3 text-right">Costo Base</th>
                  <th className="py-3 px-3">Proveedor</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {ingredients.map((ing) => {
                  const isLow = ing.stockQty <= ing.minStock;
                  return (
                    <tr key={ing.id} className="hover:bg-surface-container-high/40 transition-colors">
                      <td className="py-3 px-4 font-semibold">
                        <div className="flex items-center gap-2">
                          <span>{ing.name}</span>
                          {ing.isCritical && (
                            <span className="text-[9px] bg-primary-container text-white px-1.5 py-0.2 rounded-full font-bold">
                              Crítico
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-container-highest">
                          {ing.kind}
                        </span>
                      </td>
                      <td className={`py-3 px-3 text-right font-bold ${isLow ? 'text-error font-headline' : 'text-on-surface'}`}>
                        {formatQty(ing.stockQty, ing.baseUnit)}
                      </td>
                      <td className="py-3 px-3 text-right text-on-surface-variant">
                        {formatQty(ing.minStock, ing.baseUnit)}
                      </td>
                      <td className="py-3 px-3 text-right font-headline">
                        ${ing.costPerBaseUnit.toLocaleString('es-AR', { maximumFractionDigits: 2 })} /{ing.baseUnit.toLowerCase()}
                      </td>
                      <td className="py-3 px-3 text-on-surface-variant">
                        {ing.supplier?.name || 'Local'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isLow
                              ? 'bg-error-container text-error'
                              : 'bg-emerald-500/10 text-emerald-500'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {isLow ? 'Reponer' : 'Óptimo'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'LOTES' ? (
        <div className="bg-surface-container rounded-2xl border border-outline-variant/40 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-outline-variant/30 flex items-center justify-between">
            <span className="text-xs font-headline font-bold text-on-surface">
              Lotes activos con consumo FEFO (First-Expired, First-Out)
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-on-surface">
              <thead className="bg-surface-container-high/60 border-b border-outline-variant/30 font-headline uppercase text-[10px] text-on-surface-variant font-bold">
                <tr>
                  <th className="py-3 px-4">Código Lote</th>
                  <th className="py-3 px-3">Insumo</th>
                  <th className="py-3 px-3 text-right">Cantidad Restante</th>
                  <th className="py-3 px-3 text-right">Costo Unitario</th>
                  <th className="py-3 px-4">Fecha de Vencimiento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {batches.map((b) => (
                  <tr key={b.id} className="hover:bg-surface-container-high/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-primary">{b.code}</td>
                    <td className="py-3 px-3 font-semibold">{b.ingredient?.name}</td>
                    <td className="py-3 px-3 text-right font-bold">
                      {formatQty(b.qtyRemaining, b.ingredient?.baseUnit || 'G')}
                    </td>
                    <td className="py-3 px-3 text-right font-headline">
                      ${b.unitCost.toLocaleString('es-AR')}
                    </td>
                    <td className="py-3 px-4">
                      {b.expiresAt ? (
                        <span className="inline-flex items-center gap-1.5 font-semibold text-tertiary">
                          <span className="material-symbols-outlined text-[14px]">event</span>
                          {new Date(b.expiresAt).toLocaleDateString('es-AR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      ) : (
                        <span className="text-on-surface-variant">Sin vencimiento</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'MOVIMIENTOS' ? (
        <div className="bg-surface-container rounded-2xl border border-outline-variant/40 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-on-surface">
              <thead className="bg-surface-container-high/60 border-b border-outline-variant/30 font-headline uppercase text-[10px] text-on-surface-variant font-bold">
                <tr>
                  <th className="py-3 px-4">Fecha / Hora</th>
                  <th className="py-3 px-3">Insumo</th>
                  <th className="py-3 px-3">Tipo Movimiento</th>
                  <th className="py-3 px-3 text-right">Cantidad</th>
                  <th className="py-3 px-4">Motivo / Operador</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {movements.map((m) => (
                  <tr key={m.id} className="hover:bg-surface-container-high/40 transition-colors">
                    <td className="py-3 px-4 text-on-surface-variant">
                      {new Date(m.createdAt).toLocaleDateString('es-AR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-3 font-semibold">{m.ingredient?.name}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          m.type === 'SALE'
                            ? 'bg-primary/10 text-primary'
                            : m.type === 'WASTE'
                            ? 'bg-error/15 text-error'
                            : 'bg-emerald-500/10 text-emerald-500'
                        }`}
                      >
                        {m.type}
                      </span>
                    </td>
                    <td
                      className={`py-3 px-3 text-right font-headline font-bold ${
                        m.qty < 0 ? 'text-primary' : 'text-emerald-500'
                      }`}
                    >
                      {m.qty > 0 ? `+${m.qty}` : m.qty} {m.ingredient?.baseUnit?.toLowerCase()}
                    </td>
                    <td className="py-3 px-4 text-on-surface-variant truncate max-w-xs">
                      {m.reason} {m.userName ? `• ${m.userName}` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Pestaña Producción */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {prepIngredients.map((prep) => (
            <div
              key={prep.id}
              className="p-5 rounded-2xl bg-surface-container border border-outline-variant/40 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-headline font-bold text-sm text-on-surface">{prep.name}</h3>
                  <span className="text-[10px] text-secondary font-bold uppercase tracking-wider">
                    Preparación Shokunin
                  </span>
                </div>
                <span className="text-xs font-headline font-bold text-primary">
                  {formatQty(prep.stockQty, prep.baseUnit)}
                </span>
              </div>
              <p className="text-xs text-on-surface-variant">
                Rendimiento de tanda: {prep.prepOutputQty ? `${prep.prepOutputQty} ${prep.baseUnit}` : 'Proporcional'}.
                Costo estimado: ${prep.costPerBaseUnit.toFixed(2)} por {prep.baseUnit.toLowerCase()}.
              </p>
              <button
                onClick={() => {
                  setSelectedPrepId(prep.id);
                  setProduceModalOpen(true);
                }}
                className="w-full py-2 rounded-xl bg-primary text-white font-headline text-xs font-bold shadow-sm hover:bg-primary-container transition-all"
              >
                Producir Tanda
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal Producción */}
      {produceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface rounded-2xl max-w-sm w-full p-5 space-y-4 border border-outline-variant/40 shadow-xl">
            <h3 className="font-headline font-bold text-sm text-on-surface">Producir Preparación de Cocina</h3>
            <form onSubmit={handleProduce} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">
                  Preparación a elaborar:
                </label>
                <select
                  value={selectedPrepId}
                  onChange={(e) => setSelectedPrepId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container border border-outline-variant/60"
                  required
                >
                  <option value="">Selecciona...</option>
                  {prepIngredients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">
                  Cantidad de tandas:
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={batchesCount}
                  onChange={(e) => setBatchesCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container border border-outline-variant/60"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setProduceModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-surface-container"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={producing}
                  className="px-4 py-1.5 rounded-xl bg-primary text-white text-xs font-bold disabled:opacity-50"
                >
                  {producing ? 'Registrando...' : 'Confirmar Tanda'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Merma */}
      {wasteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface rounded-2xl max-w-sm w-full p-5 space-y-4 border border-outline-variant/40 shadow-xl">
            <h3 className="font-headline font-bold text-sm text-on-surface">Registrar Merma / Desperdicio</h3>
            <form onSubmit={handleWaste} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">Insumo:</label>
                <select
                  value={wasteIngredientId}
                  onChange={(e) => setWasteIngredientId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container border border-outline-variant/60"
                  required
                >
                  <option value="">Selecciona insumo...</option>
                  {ingredients.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.baseUnit})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">
                  Cantidad a descartar:
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={wasteQty}
                  onChange={(e) => setWasteQty(e.target.value)}
                  placeholder="Ej: 250 (g)"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container border border-outline-variant/60"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">Motivo:</label>
                <input
                  type="text"
                  value={wasteReason}
                  onChange={(e) => setWasteReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container border border-outline-variant/60"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setWasteModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-surface-container"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingWaste}
                  className="px-4 py-1.5 rounded-xl bg-error text-white text-xs font-bold disabled:opacity-50"
                >
                  {savingWaste ? 'Descontando...' : 'Registrar Merma'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
