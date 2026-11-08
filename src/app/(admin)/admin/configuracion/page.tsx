'use client';

import React, { useState } from 'react';

export default function AdminConfiguracionPage() {
  const [storeName, setStoreName] = useState('Yankun Sushi Lab — Sushi de Autor');
  const [whatsapp, setWhatsapp] = useState('+54 9 11 5555 6666');
  const [cbu, setCbu] = useState('0000003100012345678901');
  const [alias, setAlias] = useState('YANKUN.SUSHI.LAB');
  const [holder, setHolder] = useState('Yankun Gastronomia SRL');
  const [takeawayDiscount, setTakeawayDiscount] = useState('15');
  const [openHours, setOpenHours] = useState('Martes a Domingo de 19:30 a 23:45 hs');
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="pb-4 border-b border-outline-variant/30">
        <span className="font-headline text-xs uppercase tracking-wider text-secondary font-bold">
          Centro de Control
        </span>
        <h1 className="font-headline font-bold text-2xl text-on-surface mt-0.5">
          Configuración General del Negocio
        </h1>
        <p className="text-xs text-on-surface-variant">
          Modifica datos bancarios, números de WhatsApp, descuentos y parámetros globales.
        </p>
      </div>

      {savedNotice && (
        <div className="p-3 rounded-xl bg-tertiary-container text-on-tertiary-container text-xs font-headline font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>¡Parámetros actualizados y sincronizados con la PWA!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        {/* Store Profile */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30 space-y-4">
          <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface-variant">
            Identidad del Local
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
                WhatsApp de Atención al Cliente:
              </label>
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
                Descuento Retiro en Local (%):
              </label>
              <input
                type="number"
                value={takeawayDiscount}
                onChange={(e) => setTakeawayDiscount(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
              Horario de Atención Público:
            </label>
            <input
              type="text"
              value={openHours}
              onChange={(e) => setOpenHours(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Banking Details */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30 space-y-4">
          <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-secondary">
            Datos de Transferencia Bancaria
          </h3>

          <div>
            <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
              CBU (22 Dígitos):
            </label>
            <input
              type="text"
              value={cbu}
              onChange={(e) => setCbu(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary font-mono"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
                Alias Bancario:
              </label>
              <input
                type="text"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary uppercase font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
                Razón Social / Titular:
              </label>
              <input
                type="text"
                value={holder}
                onChange={(e) => setHolder(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3.5 rounded-full bg-primary hover:bg-primary-container text-white font-headline font-bold text-sm shadow-md transition-all active:scale-[0.98]"
        >
          Guardar Cambios del Sistema
        </button>
      </form>
    </div>
  );
}
