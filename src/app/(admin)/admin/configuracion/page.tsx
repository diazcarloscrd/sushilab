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

  // Estados de perfil y credenciales del administrador
  const [adminName, setAdminName] = useState('Itamae Yankun (Master Owner)');
  const [adminEmail, setAdminEmail] = useState('admin@yankun');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingCreds, setSavingCreds] = useState(false);
  const [credNotice, setCredNotice] = useState('');
  const [credError, setCredError] = useState('');

  // Cargar configuración existente y perfil desde la base de datos
  useEffect(() => {
    async function loadData() {
      try {
        const [settingsRes, profileRes] = await Promise.all([
          fetch('/api/admin/settings'),
          fetch('/api/admin/profile'),
        ]);

        if (settingsRes.ok) {
          const list = await settingsRes.json();
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

        if (profileRes.ok) {
          const pData = await profileRes.json();
          if (pData?.user) {
            setAdminName(pData.user.name || '');
            setAdminEmail(pData.user.email || '');
          }
        }
      } catch (err: any) {
        console.error('Error cargando configuración:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
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

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCreds(true);
    setCredError('');
    setCredNotice('');

    try {
      if (newPassword && newPassword !== confirmPassword) {
        throw new Error('Las nuevas contraseñas no coinciden.');
      }

      if (newPassword && newPassword.length < 8) {
        throw new Error('La contraseña debe tener al menos 8 caracteres.');
      }

      const res = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: adminName,
          email: adminEmail,
          newPassword: newPassword || undefined,
          confirmPassword: confirmPassword || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudieron actualizar las credenciales.');

      setCredNotice('¡Credenciales actualizadas correctamente!');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setCredNotice(''), 4000);
    } catch (err: any) {
      setCredError(err.message || 'Error al actualizar credenciales');
    } finally {
      setSavingCreds(false);
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
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-headline font-bold text-xl sm:text-2xl text-on-surface">
            Configuración del Local & Seguridad
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Administra los parámetros de tu negocio en Bahía Blanca y las credenciales de acceso al CRM
          </p>
        </div>
      </div>

      {savedNotice && (
        <div className="p-3.5 rounded-xl bg-tertiary-container/30 border border-tertiary/40 text-tertiary text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>¡Parámetros de la tienda actualizados exitosamente!</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-error-container text-on-error-container text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Formulario de Configuración de la Tienda */}
      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Estado Operativo */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                storeIsOpen ? 'bg-tertiary-container/30 text-tertiary' : 'bg-error-container text-error'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">
                {storeIsOpen ? 'storefront' : 'lock_clock'}
              </span>
            </div>
            <div>
              <h3 className="font-headline font-bold text-sm text-on-surface">
                Estado de la Cocina / Tienda Online
              </h3>
              <p className="text-xs text-on-surface-variant">
                {storeIsOpen
                  ? 'Abierto al público — Aceptando pedidos para delivery y take-away.'
                  : 'Cerrado temporalmente — Los clientes podrán ver el menú y programar pedidos.'}
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={storeIsOpen}
              onChange={(e) => setStoreIsOpen(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-outline-variant after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
          </label>
        </div>

        {/* Datos Principales del Local */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30 space-y-4">
          <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-primary">store</span>
            Información del Local (Bahía Blanca)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
                Nombre de la Tienda:
              </label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
                Dirección del Local (Retiro Take Away):
              </label>
              <input
                type="text"
                value={storeAddress}
                onChange={(e) => setStoreAddress(e.target.value)}
                placeholder="Alsina 350, Centro, Bahía Blanca"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
                Ciudad / Localidad:
              </label>
              <input
                type="text"
                value={storeCity}
                onChange={(e) => setStoreCity(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

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
                Aplica automáticamente cuando el cliente retira por Alsina 350.
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
                Incentivo para pagos en efectivo al delivery o en mostrador.
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
                <span>Guardando Parámetros...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[16px]">save</span>
                <span>Guardar Parámetros de la Tienda</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* SECCIÓN INDEPENDIENTE: Seguridad y Credenciales del Dueño */}
      <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30 space-y-4 mt-8">
        <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">admin_panel_settings</span>
            <h3 className="font-headline font-bold text-sm text-on-surface">
              Credenciales de Acceso Administrador & Propietario
            </h3>
          </div>
          <span className="text-[11px] bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full font-semibold">
            Ruta Secreta: /adminyankunsushilab
          </span>
        </div>

        <p className="text-xs text-on-surface-variant leading-relaxed">
          Aquí puedes actualizar tu nombre, correo/usuario y contraseña maestra. El acceso al panel está completamente oculto del público y solo se ingresa mediante la URL privada.
        </p>

        {credNotice && (
          <div className="p-3 rounded-xl bg-tertiary-container/30 border border-tertiary/40 text-tertiary text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span>{credNotice}</span>
          </div>
        )}

        {credError && (
          <div className="p-3 rounded-xl bg-error-container text-on-error-container text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{credError}</span>
          </div>
        )}

        <form onSubmit={handleSaveCredentials} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
                Nombre del Dueño / Itamae:
              </label>
              <input
                type="text"
                required
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
                Usuario / Correo Electrónico:
              </label>
              <input
                type="text"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@yankunsushi.com o admin@yankun"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary"
              />
              <span className="text-[10px] text-on-surface-variant mt-1 block">
                Permite iniciar sesión tanto con tu correo completo como con <code className="bg-surface-container-high px-1 rounded">admin@yankun</code>.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
                Nueva Contraseña (dejar vacío si no deseas cambiarla):
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
                Confirmar Nueva Contraseña:
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la nueva contraseña"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-on-surface-variant">
              <span>PIN Rápido Tablet Cocina: </span>
              <strong className="font-mono text-primary font-bold">888888</strong>
            </div>

            <button
              type="submit"
              disabled={savingCreds}
              className="px-5 py-2.5 rounded-xl bg-inverse-surface text-inverse-on-surface font-headline text-xs font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              {savingCreds ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Actualizando...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">key</span>
                  <span>Actualizar Credenciales</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
