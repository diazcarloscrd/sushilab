'use client';

import React, { useState, useEffect } from 'react';

export default function AdminConfiguracionPage() {
  const [loading, setLoading] = useState(true);
  const [storeName, setStoreName] = useState('Yankun Sushi Lab — Bahía Blanca');
  const [storeIsOpen, setStoreIsOpen] = useState(true);
  const [storeAddress, setStoreAddress] = useState('Alsina 350, Centro, Bahía Blanca');
  const [storeCity, setStoreCity] = useState('Bahía Blanca, Buenos Aires');
  const [whatsapp, setWhatsapp] = useState('+5492915556677');
  const [cbu, setCbu] = useState('0000003100012345678901');
  const [alias, setAlias] = useState('YANKUN.SUSHI.BBLA');
  const [holder, setHolder] = useState('Yankun Gastronomia SRL');
  const [takeawayDiscount, setTakeawayDiscount] = useState('15');
  const [cashDiscount, setCashDiscount] = useState('10');
  const [openHours, setOpenHours] = useState('Martes a Domingo de 19:30 a 23:45 hs');
  const [savedNotice, setSavedNotice] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Cargar configuración existente desde la base de datos
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/admin/settings');
        if (res.ok) {
          const list = await res.json();
          const map: Record<string, string> = {};
          list.forEach((item: any) => {
            map[item.key] = item.value;
          });

          if (map.STORE_NAME) setStoreName(map.STORE_NAME);
          if (map.STORE_IS_OPEN) setStoreIsOpen(map.STORE_IS_OPEN === 'true');
          if (map.STORE_ADDRESS) setStoreAddress(map.STORE_ADDRESS);
          if (map.STORE_CITY) setStoreCity(map.STORE_CITY);
          if (map.WHATSAPP_SUPPORT) setWhatsapp(map.WHATSAPP_SUPPORT);
          if (map.BANK_CBU) setCbu(map.BANK_CBU);
          if (map.BANK_ALIAS) setAlias(map.BANK_ALIAS);
          if (map.BANK_HOLDER) setHolder(map.BANK_HOLDER);
          if (map.TAKEAWAY_DISCOUNT_PERCENT) setTakeawayDiscount(map.TAKEAWAY_DISCOUNT_PERCENT);
          if (map.CASH_DISCOUNT_PERCENT) setCashDiscount(map.CASH_DISCOUNT_PERCENT);
          if (map.STORE_OPEN_HOURS) setOpenHours(map.STORE_OPEN_HOURS);
        }
      } catch (err: any) {
        console.error('Error cargando configuración:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage('');

    try {
      const payload = {
        settings: {
          STORE_NAME: storeName,
          STORE_IS_OPEN: storeIsOpen ? 'true' : 'false',
          STORE_ADDRESS: storeAddress,
          STORE_CITY: storeCity,
          WHATSAPP_SUPPORT: whatsapp,
          BANK_CBU: cbu,
          BANK_ALIAS: alias,
          BANK_HOLDER: holder,
          TAKEAWAY_DISCOUNT_PERCENT: takeawayDiscount,
          CASH_DISCOUNT_PERCENT: cashDiscount,
          STORE_OPEN_HOURS: openHours,
        },
      };

      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'No se pudieron guardar los parámetros');
      }

      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 3500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error guardando configuración');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="pb-4 border-b border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="font-headline text-xs uppercase tracking-wider text-secondary font-bold">
            Bahía Blanca • Centro de Control
          </span>
          <h1 className="font-headline font-bold text-2xl text-on-surface mt-0.5">
            Configuración General del Negocio
          </h1>
          <p className="text-xs text-on-surface-variant">
            Parámetros en vivo sincronizados con la PWA, el carrito y el KDS de cocina.
          </p>
        </div>

        {/* Switch Local Abierto/Cerrado en tiempo real */}
        <div className="flex items-center gap-3 bg-surface-container-low px-4 py-2.5 rounded-2xl border border-outline-variant/40">
          <div className="flex flex-col text-right">
            <span className="font-headline font-bold text-xs">
              {storeIsOpen ? 'Local Abierto' : 'Local Cerrado'}
            </span>
            <span className="text-[10px] text-on-surface-variant">
              {storeIsOpen ? 'Aceptando pedidos' : 'Solo pedidos diferidos'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setStoreIsOpen(!storeIsOpen)}
            className={`w-12 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${
              storeIsOpen ? 'bg-primary' : 'bg-outline-variant'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                storeIsOpen ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {savedNotice && (
        <div className="p-3.5 rounded-xl bg-tertiary-container text-on-tertiary-container text-xs font-headline font-bold flex items-center gap-2 shadow-sm">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>¡Parámetros actualizados y sincronizados con la tienda de Bahía Blanca!</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-error-container text-on-error-container text-xs font-headline font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        {/* Store Profile */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30 space-y-4">
          <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-primary">storefront</span>
            Identidad del Local (Bahía Blanca)
          </h3>

          <div>
            <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
              Nombre Comercial:
            </label>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
                Dirección Local (Take Away):
              </label>
              <input
                type="text"
                value={storeAddress}
                onChange={(e) => setStoreAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
                Ciudad y Provincia:
              </label>
              <input
                type="text"
                value={storeCity}
                onChange={(e) => setStoreCity(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
                WhatsApp Oficial de Atención:
              </label>
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="+5492915556677"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
                Horarios de Atención:
              </label>
              <input
                type="text"
                value={openHours}
                onChange={(e) => setOpenHours(e.target.value)}
                placeholder="Martes a Domingo de 19:30 a 23:45 hs"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>

        {/* Políticas de Descuentos */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30 space-y-4">
          <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-tertiary">percent</span>
            Estrategia de Descuentos Comerciales
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
                Descuento Take Away (%):
              </label>
              <input
                type="number"
                min="0"
                max="50"
                value={takeawayDiscount}
                onChange={(e) => setTakeawayDiscount(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary"
              />
              <span className="text-[10px] text-on-surface-variant mt-1 block">
                Aplica cuando el cliente retira por el local.
              </span>
            </div>

            <div>
              <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
                Descuento Pago Efectivo (%):
              </label>
              <input
                type="number"
                min="0"
                max="50"
                value={cashDiscount}
                onChange={(e) => setCashDiscount(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary"
              />
              <span className="text-[10px] text-on-surface-variant mt-1 block">
                Incentivo para evitar comisiones de pasarela.
              </span>
            </div>
          </div>
        </div>

        {/* Datos Bancarios para Transferencia */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30 space-y-4">
          <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-secondary">account_balance</span>
            Datos Bancarios (Transferencias Directas)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
                Alias Bancario:
              </label>
              <input
                type="text"
                value={alias}
                onChange={(e) => setAlias(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface font-mono font-bold focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
                CBU / CVU:
              </label>
              <input
                type="text"
                value={cbu}
                onChange={(e) => setCbu(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface font-mono focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
              Titular de la Cuenta:
            </label>
            <input
              type="text"
              value={holder}
              onChange={(e) => setHolder(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded-xl bg-primary text-white font-headline text-xs font-bold hover:bg-primary/90 active:scale-95 transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[16px]">save</span>
                <span>Guardar y Aplicar Cambios</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
