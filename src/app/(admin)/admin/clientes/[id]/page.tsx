'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function CustomerDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [allergiesInput, setAllergiesInput] = useState('');
  const [savingAllergies, setSavingAllergies] = useState(false);

  const fetchCustomer = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/customers/${id}`);
      if (res.ok) {
        const data = await res.json();
        setCustomer(data);
        setAllergiesInput(data.allergies || '');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchCustomer();
  }, [id]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    try {
      setSavingNote(true);
      const res = await fetch(`/api/admin/customers/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newNote }),
      });
      if (res.ok) {
        setNewNote('');
        fetchCustomer();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingNote(false);
    }
  };

  const handleSaveAllergies = async () => {
    try {
      setSavingAllergies(true);
      const res = await fetch(`/api/admin/customers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allergies: allergiesInput }),
      });
      if (res.ok) {
        fetchCustomer();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingAllergies(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-on-surface-variant">Cargando ficha 360° del cliente...</div>;
  }

  if (!customer) {
    return (
      <div className="p-12 text-center text-xs text-error space-y-2">
        <div>Cliente no encontrado.</div>
        <Link href="/admin/clientes" className="text-primary underline">Volver al listado</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back button */}
      <div>
        <Link
          href="/admin/clientes"
          className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-on-surface font-headline font-semibold transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          <span>Volver al CRM de Clientes</span>
        </Link>
      </div>

      {/* Header Profile Card */}
      <div className="p-6 rounded-2xl bg-surface-container border border-outline-variant/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center font-bold text-xl text-primary font-headline">
            {customer.name?.charAt(0) || 'C'}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-headline font-bold text-xl text-on-surface">{customer.name}</h1>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  customer.segment === 'VIP'
                    ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                    : 'bg-secondary-container text-on-secondary-container'
                }`}
              >
                Segmento {customer.segment || 'NUEVO'}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-container-highest">
                Nivel {customer.tier || 'BRONCE'}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-on-surface-variant mt-1">
              <span className="font-mono">{customer.phone}</span>
              <span>•</span>
              <a
                href={`https://wa.me/${customer.phone.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="text-primary font-semibold hover:underline inline-flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">chat</span>
                <span>WhatsApp</span>
              </a>
            </div>
          </div>
        </div>

        <div className="text-right sm:border-l sm:border-outline-variant/30 sm:pl-6">
          <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider block">
            Puntos Disponibles
          </span>
          <div className="font-mono font-bold text-2xl text-tertiary">
            {customer.pointsBalance || 0} pts
          </div>
        </div>
      </div>

      {/* Alergias & Restricciones Sanitarias */}
      <div className="p-5 rounded-2xl bg-surface-container border border-outline-variant/40 space-y-2">
        <div className="flex items-center justify-between">
          <label className="font-headline font-bold text-xs text-on-surface flex items-center gap-1.5">
            <span className="material-symbols-outlined text-error text-[18px]">emergency</span>
            <span>Alergias Alimentarias & Restricciones del Itamae:</span>
          </label>
          <button
            onClick={handleSaveAllergies}
            disabled={savingAllergies}
            className="text-xs font-headline font-bold text-primary hover:underline disabled:opacity-50"
          >
            {savingAllergies ? 'Guardando...' : 'Guardar Alergia'}
          </button>
        </div>
        <input
          type="text"
          value={allergiesInput}
          onChange={(e) => setAllergiesInput(e.target.value)}
          placeholder="Ej: Alérgico a los mariscos, celíaco (Shoyu sin TACC), sin palta..."
          className="w-full px-3.5 py-2 text-xs rounded-xl bg-surface border border-outline-variant/60 text-error font-semibold focus:outline-none focus:border-error"
        />
        <p className="text-[10px] text-on-surface-variant">
          ⚠️ Las alertas de alergias ingresadas aquí aparecerán automáticamente en rojo en la comanda de cocina y en los tickets térmicos.
        </p>
      </div>

      {/* Métricas RFM */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/40 space-y-1">
          <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider block">
            Pedidos Totales
          </span>
          <div className="font-headline font-bold text-xl text-on-surface">{customer.ordersCount || 0}</div>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/40 space-y-1">
          <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider block">
            Gasto Histórico
          </span>
          <div className="font-headline font-bold text-xl text-primary">
            ${(customer.totalSpent || 0).toLocaleString('es-AR')}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/40 space-y-1">
          <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider block">
            Ticket Promedio
          </span>
          <div className="font-headline font-bold text-xl text-secondary">
            ${customer.ordersCount > 0 ? Math.round(customer.totalSpent / customer.ordersCount).toLocaleString('es-AR') : 0}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/40 space-y-1">
          <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider block">
            Consentimiento WhatsApp
          </span>
          <div className="font-headline font-bold text-xl text-emerald-500">
            {customer.marketingConsent ? 'Activo' : 'No'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Historial de Comandas */}
        <div className="bg-surface-container rounded-2xl border border-outline-variant/40 overflow-hidden space-y-3 p-5">
          <h3 className="font-headline font-bold text-sm text-on-surface">Historial de Pedidos Recientes</h3>
          <div className="space-y-2">
            {(customer.orders || []).length === 0 ? (
              <div className="text-xs text-on-surface-variant py-4 text-center">Sin pedidos registrados.</div>
            ) : (
              customer.orders.map((o: any) => (
                <div
                  key={o.id}
                  className="p-3 rounded-xl bg-surface border border-outline-variant/30 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-mono font-bold text-primary block">Comanda #{o.orderNumber}</span>
                    <span className="text-[10px] text-on-surface-variant">
                      {new Date(o.createdAt).toLocaleDateString('es-AR')} • {o.paymentMethod}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-headline font-bold text-on-surface block">
                      ${o.total.toLocaleString('es-AR')}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-500">{o.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Notas Internas del Personal */}
        <div className="bg-surface-container rounded-2xl border border-outline-variant/40 space-y-4 p-5">
          <h3 className="font-headline font-bold text-sm text-on-surface">Notas del Equipo</h3>

          <form onSubmit={handleAddNote} className="space-y-2">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Ej: Suele pedir palillos extra y jengibre doble..."
              rows={2}
              className="w-full px-3 py-2 text-xs rounded-xl bg-surface border border-outline-variant/60 focus:outline-none focus:border-primary"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingNote}
                className="px-3.5 py-1.5 rounded-xl bg-primary text-white text-xs font-headline font-bold disabled:opacity-50"
              >
                {savingNote ? 'Guardando...' : 'Añadir Nota'}
              </button>
            </div>
          </form>

          <div className="space-y-2 max-h-56 overflow-y-auto">
            {(customer.notes || []).map((n: any) => (
              <div key={n.id} className="p-3 rounded-xl bg-surface border border-outline-variant/20 text-xs space-y-1">
                <p className="text-on-surface">{n.text}</p>
                <div className="text-[10px] text-on-surface-variant">
                  {n.userName || 'Personal'} • {new Date(n.createdAt).toLocaleDateString('es-AR')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
