'use client';

import React, { useState, useEffect } from 'react';

export default function AdminCajaRepartoPage() {
  const [activeTab, setActiveTab] = useState<'TURNO' | 'REPARTO' | 'HISTORIAL'>('TURNO');
  const [loading, setLoading] = useState(true);
  const [currentShift, setCurrentShift] = useState<any>(null);
  const [pastShifts, setPastShifts] = useState<any[]>([]);
  const [couriers, setCouriers] = useState<any[]>([]);

  // Modal Abrir Turno
  const [openShiftModal, setOpenShiftModal] = useState(false);
  const [openingFloat, setOpeningFloat] = useState('15000');
  const [openNotes, setOpenNotes] = useState('Apertura turno noche');
  const [submittingOpen, setSubmittingOpen] = useState(false);

  // Modal Cerrar Turno
  const [closeShiftModal, setCloseShiftModal] = useState(false);
  const [countedCash, setCountedCash] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [submittingClose, setSubmittingClose] = useState(false);

  // Modal Gasto / Movimiento
  const [movementModal, setMovementModal] = useState(false);
  const [movType, setMovType] = useState<'EXPENSE' | 'INCOME' | 'WITHDRAWAL'>('EXPENSE');
  const [movAmount, setMovAmount] = useState('');
  const [movReason, setMovReason] = useState('Hielo / Insumo urgente');
  const [submittingMov, setSubmittingMov] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/shifts');
      if (res.ok) {
        const data = await res.json();
        setCurrentShift(data.currentShift);
        setPastShifts(data.pastShifts || []);
        setCouriers(data.couriers || []);
      }
    } catch (err) {
      console.error('Error fetching shifts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingOpen(true);
      const res = await fetch('/api/admin/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'OPEN_SHIFT',
          openingFloat: Number(openingFloat),
          notes: openNotes,
        }),
      });
      if (res.ok) {
        setOpenShiftModal(false);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingOpen(false);
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentShift) return;
    try {
      setSubmittingClose(true);
      const res = await fetch('/api/admin/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CLOSE_SHIFT',
          shiftId: currentShift.id,
          countedCash: Number(countedCash),
          notes: closeNotes,
        }),
      });
      if (res.ok) {
        setCloseShiftModal(false);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingClose(false);
    }
  };

  const handleAddMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentShift || !movAmount) return;
    try {
      setSubmittingMov(true);
      const res = await fetch('/api/admin/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ADD_MOVEMENT',
          shiftId: currentShift.id,
          type: movType,
          amount: Number(movAmount),
          reason: movReason,
        }),
      });
      if (res.ok) {
        setMovementModal(false);
        setMovAmount('');
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingMov(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-headline font-bold text-2xl text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[28px]">point_of_sale</span>
            Caja & Reparto — Control Operativo
          </h1>
          <p className="text-xs text-on-surface-variant mt-1">
            Arqueo de caja en vivo, turnos de servicio y control de rendiciones de cadetes para Bahía Blanca.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {currentShift ? (
            <>
              <button
                onClick={() => setMovementModal(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/60 font-headline text-xs font-semibold text-on-surface hover:bg-surface-container-high transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">payments</span>
                <span>Registrar Gasto/Retiro</span>
              </button>
              <button
                onClick={() => setCloseShiftModal(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-error text-white font-headline text-xs font-bold shadow-sm hover:opacity-95 transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">lock</span>
                <span>Cerrar Turno POS</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setOpenShiftModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white font-headline text-xs font-bold shadow-md hover:bg-primary-container transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">lock_open</span>
              <span>Abrir Turno de Caja</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-outline-variant/30 pb-2">
        {[
          { key: 'TURNO', label: 'Turno Actual en Vivo', icon: 'point_of_sale' },
          { key: 'REPARTO', label: 'Cadetes & Despacho', icon: 'two_wheeler' },
          { key: 'HISTORIAL', label: 'Historial de Cierres', icon: 'receipt_long' },
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

      {loading ? (
        <div className="p-12 text-center text-xs text-on-surface-variant">Cargando datos de caja...</div>
      ) : activeTab === 'TURNO' ? (
        currentShift ? (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/40 space-y-1">
                <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider block">
                  Efectivo en Caja Esperado
                </span>
                <div className="font-headline font-bold text-xl text-primary">
                  ${currentShift.expectedCash?.toLocaleString('es-AR')}
                </div>
                <span className="text-[10px] text-on-surface-variant block">
                  Fondo Inicial: ${currentShift.openingFloat?.toLocaleString('es-AR')}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/40 space-y-1">
                <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider block">
                  Mercado Pago Aprobado
                </span>
                <div className="font-headline font-bold text-xl text-secondary">
                  ${currentShift.mpTotal?.toLocaleString('es-AR')}
                </div>
                <span className="text-[10px] text-on-surface-variant block">Acreditado automáticamente</span>
              </div>

              <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/40 space-y-1">
                <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider block">
                  Transferencias Validadas
                </span>
                <div className="font-headline font-bold text-xl text-tertiary">
                  ${currentShift.transTotal?.toLocaleString('es-AR')}
                </div>
                <span className="text-[10px] text-on-surface-variant block">Con comprobante bancario</span>
              </div>

              <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/40 space-y-1">
                <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider block">
                  Comandas del Turno
                </span>
                <div className="font-headline font-bold text-xl text-on-surface">
                  {currentShift.ordersCount} pedidos
                </div>
                <span className="text-[10px] text-emerald-500 font-bold block">
                  {currentShift.deliveredCount} entregados
                </span>
              </div>
            </div>

            {/* Movimientos del turno */}
            <div className="bg-surface-container rounded-2xl border border-outline-variant/40 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-outline-variant/30 flex items-center justify-between">
                <span className="text-xs font-headline font-bold text-on-surface">
                  Movimientos y Egresos del Turno #{currentShift.number}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-on-surface">
                  <thead className="bg-surface-container-high/60 border-b border-outline-variant/30 font-headline uppercase text-[10px] text-on-surface-variant font-bold">
                    <tr>
                      <th className="py-3 px-4">Hora</th>
                      <th className="py-3 px-3">Tipo</th>
                      <th className="py-3 px-3 text-right">Monto</th>
                      <th className="py-3 px-4">Motivo / Responsable</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/20">
                    {(currentShift.movements || []).length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-on-surface-variant text-xs">
                          Sin movimientos extraordinarios en este turno.
                        </td>
                      </tr>
                    ) : (
                      currentShift.movements.map((m: any) => (
                        <tr key={m.id} className="hover:bg-surface-container-high/30 transition-colors">
                          <td className="py-3 px-4 text-on-surface-variant">
                            {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                m.type === 'INCOME' || m.type === 'COURIER_SETTLEMENT'
                                  ? 'bg-emerald-500/10 text-emerald-500'
                                  : 'bg-error/15 text-error'
                              }`}
                            >
                              {m.type}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-headline font-bold">
                            ${m.amount.toLocaleString('es-AR')}
                          </td>
                          <td className="py-3 px-4 text-on-surface-variant">
                            {m.reason} • {m.userName}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-12 text-center bg-surface-container rounded-2xl border border-outline-variant/40 space-y-3">
            <span className="material-symbols-outlined text-[48px] text-on-surface-variant">lock</span>
            <h3 className="font-headline font-bold text-base text-on-surface">No hay un turno de caja abierto</h3>
            <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
              Abre el turno para habilitar la toma de comandas inmediatas en efectivo y delivery.
            </p>
            <button
              onClick={() => setOpenShiftModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white font-headline text-xs font-bold shadow-md hover:bg-primary-container transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">lock_open</span>
              <span>Abrir Turno Ahora</span>
            </button>
          </div>
        )
      ) : activeTab === 'REPARTO' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {couriers.map((c) => (
              <div
                key={c.id}
                className="p-5 rounded-2xl bg-surface-container border border-outline-variant/40 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-headline font-bold text-sm text-on-surface">{c.name}</h3>
                    <span className="text-xs text-on-surface-variant font-mono">{c.phone}</span>
                  </div>
                  <span className="bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full text-[10px] font-bold">
                    Activo
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant">{c.notes || 'Cadete propio de reparto'}</p>
                <a
                  href={`https://wa.me/${c.phone.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-primary font-bold hover:underline"
                >
                  <span className="material-symbols-outlined text-[16px]">chat</span>
                  <span>Contactar por WhatsApp</span>
                </a>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Historial de Cierres */
        <div className="bg-surface-container rounded-2xl border border-outline-variant/40 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-on-surface">
              <thead className="bg-surface-container-high/60 border-b border-outline-variant/30 font-headline uppercase text-[10px] text-on-surface-variant font-bold">
                <tr>
                  <th className="py-3 px-4">Turno #</th>
                  <th className="py-3 px-3">Fecha Cierre</th>
                  <th className="py-3 px-3 text-right">Efectivo Esperado</th>
                  <th className="py-3 px-3 text-right">Efectivo Contado</th>
                  <th className="py-3 px-3 text-right">Diferencia</th>
                  <th className="py-3 px-4">Responsable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {pastShifts.map((s) => {
                  const diff = s.difference || 0;
                  return (
                    <tr key={s.id} className="hover:bg-surface-container-high/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-primary">#{s.number}</td>
                      <td className="py-3 px-3 text-on-surface-variant">
                        {new Date(s.closedAt || s.createdAt).toLocaleDateString('es-AR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-3 text-right font-headline">
                        ${(s.expectedCash || 0).toLocaleString('es-AR')}
                      </td>
                      <td className="py-3 px-3 text-right font-headline font-bold">
                        ${(s.countedCash || 0).toLocaleString('es-AR')}
                      </td>
                      <td
                        className={`py-3 px-3 text-right font-headline font-bold ${
                          diff === 0 ? 'text-emerald-500' : diff > 0 ? 'text-tertiary' : 'text-error'
                        }`}
                      >
                        {diff > 0 ? `+$${diff.toLocaleString('es-AR')}` : `$${diff.toLocaleString('es-AR')}`}
                      </td>
                      <td className="py-3 px-4 text-on-surface-variant truncate">{s.closedBy || s.openedBy}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Abrir Turno */}
      {openShiftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface rounded-2xl max-w-sm w-full p-5 space-y-4 border border-outline-variant/40 shadow-xl">
            <h3 className="font-headline font-bold text-sm text-on-surface">Apertura de Turno de Caja</h3>
            <form onSubmit={handleOpenShift} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">
                  Fondo Inicial de Cambio ($):
                </label>
                <input
                  type="number"
                  value={openingFloat}
                  onChange={(e) => setOpeningFloat(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container border border-outline-variant/60"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">Notas / Observaciones:</label>
                <input
                  type="text"
                  value={openNotes}
                  onChange={(e) => setOpenNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container border border-outline-variant/60"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpenShiftModal(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-surface-container"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingOpen}
                  className="px-4 py-1.5 rounded-xl bg-primary text-white text-xs font-bold disabled:opacity-50"
                >
                  {submittingOpen ? 'Abriendo...' : 'Confirmar Apertura'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cerrar Turno */}
      {closeShiftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface rounded-2xl max-w-sm w-full p-5 space-y-4 border border-outline-variant/40 shadow-xl">
            <h3 className="font-headline font-bold text-sm text-on-surface">Cierre de Turno & Arqueo</h3>
            <div className="p-3 rounded-xl bg-surface-container text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Efectivo Esperado:</span>
                <span className="font-bold text-primary">${currentShift?.expectedCash?.toLocaleString('es-AR')}</span>
              </div>
            </div>
            <form onSubmit={handleCloseShift} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">
                  Efectivo Contado en Gaveta ($):
                </label>
                <input
                  type="number"
                  value={countedCash}
                  onChange={(e) => setCountedCash(e.target.value)}
                  placeholder="Ej: 45000"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container border border-outline-variant/60"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">Observaciones de Cierre:</label>
                <input
                  type="text"
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  placeholder="Diferencias, retiros o novedades"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container border border-outline-variant/60"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCloseShiftModal(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-surface-container"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingClose}
                  className="px-4 py-1.5 rounded-xl bg-error text-white text-xs font-bold disabled:opacity-50"
                >
                  {submittingClose ? 'Cerrando...' : 'Confirmar Cierre'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Movimiento de Caja */}
      {movementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface rounded-2xl max-w-sm w-full p-5 space-y-4 border border-outline-variant/40 shadow-xl">
            <h3 className="font-headline font-bold text-sm text-on-surface">Registrar Egreso o Retiro</h3>
            <form onSubmit={handleAddMovement} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">Tipo:</label>
                <select
                  value={movType}
                  onChange={(e) => setMovType(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container border border-outline-variant/60"
                >
                  <option value="EXPENSE">Gasto menor de caja (Insumo / Limpieza)</option>
                  <option value="WITHDRAWAL">Retiro de efectivo a caja fuerte</option>
                  <option value="INCOME">Ingreso extraordinario</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">Monto ($):</label>
                <input
                  type="number"
                  value={movAmount}
                  onChange={(e) => setMovAmount(e.target.value)}
                  placeholder="Ej: 3000"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container border border-outline-variant/60"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">Motivo / Concepto:</label>
                <input
                  type="text"
                  value={movReason}
                  onChange={(e) => setMovReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container border border-outline-variant/60"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMovementModal(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-surface-container"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingMov}
                  className="px-4 py-1.5 rounded-xl bg-primary text-white text-xs font-bold disabled:opacity-50"
                >
                  {submittingMov ? 'Registrando...' : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
