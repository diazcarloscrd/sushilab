'use client';

import React, { useState, useEffect } from 'react';

export default function AdminConfiguracionPage() {
  const [activeTab, setActiveTab] = useState<'general' | 'pricing' | 'loyalty'>('general');
  const [loading, setLoading] = useState(true);

  // General store settings
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
  const [kitchenPrepTime, setKitchenPrepTime] = useState('35');
  const [announcementBanner, setAnnouncementBanner] = useState('');
  const [minOrderAmount, setMinOrderAmount] = useState('5000');
  const [mpEnabled, setMpEnabled] = useState(true);
  const [transferEnabled, setTransferEnabled] = useState(true);
  const [cashEnabled, setCashEnabled] = useState(true);
  const [instagramUrl, setInstagramUrl] = useState('https://instagram.com/yankunsushilab');
  const [whatsappTemplate, setWhatsappTemplate] = useState('¡Hola Yankun Sushi Lab! Quisiera hacer una consulta sobre mi pedido.');
  const [savedNotice, setSavedNotice] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Perfil del administrador
  const [adminName, setAdminName] = useState('YanKunSushiLab!');
  const [adminEmail, setAdminEmail] = useState('yankunsushilab!');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingCreds, setSavingCreds] = useState(false);
  const [credNotice, setCredNotice] = useState('');
  const [credError, setCredError] = useState('');

  // Pricing rules
  const [pricingRules, setPricingRules] = useState<any[]>([]);
  const [loadingRules, setLoadingRules] = useState(false);
  const [showNewRuleModal, setShowNewRuleModal] = useState(false);
  const [newRuleForm, setNewRuleForm] = useState({
    name: '',
    kind: 'PERCENT_ORDER',
    percent: 15,
    amount: 0,
    priority: 10,
    stackable: false,
    minSubtotal: 0,
    deliveryType: 'ALL',
    paymentMethod: 'ALL',
  });

  // Loyalty Settings & Simulator
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(true);
  const [amountPerPoint, setAmountPerPoint] = useState(1000);
  const [pointValue, setPointValue] = useState(50);
  const [minRedeem, setMinRedeem] = useState(100);
  const [maxRedeemPct, setMaxRedeemPct] = useState(30);

  // Simulador de puntos
  const [simSpend, setSimSpend] = useState(25000);
  const [simTier, setSimTier] = useState('BRONCE');

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
          if (map.KITCHEN_ESTIMATED_TIME_MIN) setKitchenPrepTime(map.KITCHEN_ESTIMATED_TIME_MIN);
          if (map.TOP_ANNOUNCEMENT_BANNER !== undefined) setAnnouncementBanner(map.TOP_ANNOUNCEMENT_BANNER);
          if (map.MIN_ORDER_AMOUNT) setMinOrderAmount(map.MIN_ORDER_AMOUNT);
          if (map.PAYMENT_MP_ENABLED !== undefined) setMpEnabled(map.PAYMENT_MP_ENABLED !== 'false');
          if (map.PAYMENT_TRANSFER_ENABLED !== undefined) setTransferEnabled(map.PAYMENT_TRANSFER_ENABLED !== 'false');
          if (map.PAYMENT_CASH_ENABLED !== undefined) setCashEnabled(map.PAYMENT_CASH_ENABLED !== 'false');
          if (map.INSTAGRAM_URL) setInstagramUrl(map.INSTAGRAM_URL);
          if (map.WHATSAPP_MESSAGE_TEMPLATE) setWhatsappTemplate(map.WHATSAPP_MESSAGE_TEMPLATE);
          if (map.LOYALTY_ENABLED) setLoyaltyEnabled(map.LOYALTY_ENABLED === 'true');
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

  const loadPricingRules = async () => {
    setLoadingRules(true);
    try {
      const res = await fetch('/api/admin/pricing-rules');
      if (res.ok) {
        const data = await res.json();
        setPricingRules(data.rules || []);
      }
    } catch (e) {
      console.error('Error fetching pricing rules:', e);
    } finally {
      setLoadingRules(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'pricing') {
      loadPricingRules();
    }
  }, [activeTab]);

  const handleToggleRule = async (ruleId: string, currentActive: boolean) => {
    try {
      await fetch('/api/admin/pricing-rules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ruleId, active: !currentActive }),
      });
      loadPricingRules();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('¿Eliminar esta regla de precio?')) return;
    try {
      await fetch(`/api/admin/pricing-rules?id=${ruleId}`, { method: 'DELETE' });
      loadPricingRules();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        name: newRuleForm.name,
        kind: newRuleForm.kind,
        priority: Number(newRuleForm.priority) || 10,
        stackable: Boolean(newRuleForm.stackable),
        active: true,
      };

      if (newRuleForm.kind === 'PERCENT_ORDER') {
        payload.percent = Number(newRuleForm.percent);
      } else if (newRuleForm.kind === 'AMOUNT_ORDER') {
        payload.amount = Number(newRuleForm.amount);
      }

      if (Number(newRuleForm.minSubtotal) > 0) {
        payload.minSubtotal = Number(newRuleForm.minSubtotal);
      }

      if (newRuleForm.deliveryType !== 'ALL') {
        payload.deliveryTypes = [newRuleForm.deliveryType];
      }

      if (newRuleForm.paymentMethod !== 'ALL') {
        payload.paymentMethods = [newRuleForm.paymentMethod];
      }

      const res = await fetch('/api/admin/pricing-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowNewRuleModal(false);
        setNewRuleForm({
          name: '',
          kind: 'PERCENT_ORDER',
          percent: 15,
          amount: 0,
          priority: 10,
          stackable: false,
          minSubtotal: 0,
          deliveryType: 'ALL',
          paymentMethod: 'ALL',
        });
        loadPricingRules();
      }
    } catch (e) {
      console.error(e);
    }
  };

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
          KITCHEN_ESTIMATED_TIME_MIN: kitchenPrepTime,
          TOP_ANNOUNCEMENT_BANNER: announcementBanner,
          MIN_ORDER_AMOUNT: minOrderAmount,
          PAYMENT_MP_ENABLED: mpEnabled ? 'true' : 'false',
          PAYMENT_TRANSFER_ENABLED: transferEnabled ? 'true' : 'false',
          PAYMENT_CASH_ENABLED: cashEnabled ? 'true' : 'false',
          INSTAGRAM_URL: instagramUrl,
          WHATSAPP_MESSAGE_TEMPLATE: whatsappTemplate,
          LOYALTY_ENABLED: loyaltyEnabled ? 'true' : 'false',
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

  // Cálculo de puntos simulados
  const tierMultiplier = simTier === 'ORO' ? 1.5 : simTier === 'PLATA' ? 1.25 : 1.0;
  const simEarnedPoints = Math.floor((simSpend / amountPerPoint) * tierMultiplier);
  const simValueARS = simEarnedPoints * pointValue;

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
            Configuración & Parámetros ERP
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Administra los parámetros de tu negocio en Bahía Blanca, reglas de precio y programa de fidelidad
          </p>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex items-center gap-2 border-b border-outline-variant/30 pb-2">
        <button
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-headline font-bold transition-all ${
            activeTab === 'general'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">store</span>
          <span>General & Seguridad</span>
        </button>

        <button
          onClick={() => setActiveTab('pricing')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-headline font-bold transition-all ${
            activeTab === 'pricing'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">sell</span>
          <span>Reglas de Precio</span>
        </button>

        <button
          onClick={() => setActiveTab('loyalty')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-headline font-bold transition-all ${
            activeTab === 'loyalty'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">loyalty</span>
          <span>Fidelidad & Puntos</span>
        </button>
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

      {/* TAB 1: GENERAL & SEGURIDAD */}
      {activeTab === 'general' && (
        <div className="space-y-6">
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
                    WhatsApp de Atención / Notificaciones:
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
                    Dirección del Local:
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
                    Horarios de Atención:
                  </label>
                  <input
                    type="text"
                    value={openHours}
                    onChange={(e) => setOpenHours(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* Datos Bancarios */}
            <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30 space-y-4">
              <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-primary">account_balance</span>
                Datos Bancarios para Transferencias
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
                    CBU / CVU:
                  </label>
                  <input
                    type="text"
                    value={cbu}
                    onChange={(e) => setCbu(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
                    Alias:
                  </label>
                  <input
                    type="text"
                    value={alias}
                    onChange={(e) => setAlias(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-mono font-bold rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary"
                  />
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
            </div>

            {/* Operación en Tiempo Real & Avisos */}
            <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30 space-y-4">
              <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-primary">timer</span>
                Operación en Tiempo Real & Avisos
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
                    Demora Estimada de Cocina (Minutos):
                  </label>
                  <input
                    type="number"
                    min="10"
                    step="5"
                    value={kitchenPrepTime}
                    onChange={(e) => setKitchenPrepTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary font-mono font-bold"
                  />
                  <p className="text-[10px] text-on-surface-variant mt-0.5">Se refleja en vivo en el encabezado del cliente</p>
                </div>

                <div>
                  <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
                    Pedido Mínimo de Compra ($ ARS):
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={minOrderAmount}
                    onChange={(e) => setMinOrderAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
                  Banner de Aviso / Promoción Superior Web (Opcional):
                </label>
                <input
                  type="text"
                  value={announcementBanner}
                  onChange={(e) => setAnnouncementBanner(e.target.value)}
                  placeholder="Ej: 🍣 ¡Martes y Miércoles 15% OFF en Take Away abonando en efectivo!"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary"
                />
                <p className="text-[10px] text-on-surface-variant mt-0.5">Deja vacío si no deseas mostrar ninguna franja de alerta</p>
              </div>
            </div>

            {/* Métodos de Pago & Descuentos Automáticos */}
            <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30 space-y-4">
              <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-primary">payments</span>
                Métodos de Pago Habilitados & Descuentos
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-surface-container border border-outline-variant/30 space-y-2">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-xs font-headline font-bold text-on-surface">Mercado Pago</span>
                    <input
                      type="checkbox"
                      checked={mpEnabled}
                      onChange={(e) => setMpEnabled(e.target.checked)}
                      className="rounded accent-primary w-4 h-4"
                    />
                  </label>
                  <p className="text-[10px] text-on-surface-variant">Tarjetas, Débito y Saldo MP</p>
                </div>

                <div className="p-3.5 rounded-xl bg-surface-container border border-outline-variant/30 space-y-2">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-xs font-headline font-bold text-on-surface">Transferencia</span>
                    <input
                      type="checkbox"
                      checked={transferEnabled}
                      onChange={(e) => setTransferEnabled(e.target.checked)}
                      className="rounded accent-primary w-4 h-4"
                    />
                  </label>
                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-on-surface-variant">Desc. Takeaway:</span>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={takeawayDiscount}
                      onChange={(e) => setTakeawayDiscount(e.target.value)}
                      className="w-14 px-1.5 py-0.5 text-xs text-center rounded bg-surface-container-high border border-outline-variant/40 font-bold"
                    />
                    <span className="text-xs font-bold">%</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-surface-container border border-outline-variant/30 space-y-2">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-xs font-headline font-bold text-on-surface">Efectivo</span>
                    <input
                      type="checkbox"
                      checked={cashEnabled}
                      onChange={(e) => setCashEnabled(e.target.checked)}
                      className="rounded accent-primary w-4 h-4"
                    />
                  </label>
                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-on-surface-variant">Desc. Efectivo:</span>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={cashDiscount}
                      onChange={(e) => setCashDiscount(e.target.value)}
                      className="w-14 px-1.5 py-0.5 text-xs text-center rounded bg-surface-container-high border border-outline-variant/40 font-bold"
                    />
                    <span className="text-xs font-bold">%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Canales de Contacto & Redes Oficiales */}
            <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30 space-y-4">
              <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-primary">chat</span>
                Canales de Contacto & Redes Oficiales
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
                    Perfil de Instagram Oficial:
                  </label>
                  <input
                    type="url"
                    value={instagramUrl}
                    onChange={(e) => setInstagramUrl(e.target.value)}
                    placeholder="https://instagram.com/..."
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
                    Mensaje Inicial Predeterminado de WhatsApp:
                  </label>
                  <input
                    type="text"
                    value={whatsappTemplate}
                    onChange={(e) => setWhatsappTemplate(e.target.value)}
                    placeholder="¡Hola Yankun! Quisiera consultar..."
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-primary text-white font-headline text-xs font-bold hover:bg-primary/90 transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">save</span>
                    <span>Guardar Configuración General</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Credenciales de Administrador */}
          <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30 space-y-4">
            <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-primary">security</span>
              Credenciales de Administrador (Owner)
            </h3>

            {credNotice && (
              <div className="p-3.5 rounded-xl bg-tertiary-container/30 border border-tertiary/40 text-tertiary text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                <span>{credNotice}</span>
              </div>
            )}

            {credError && (
              <div className="p-3.5 rounded-xl bg-error-container text-on-error-container text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{credError}</span>
              </div>
            )}

            <form onSubmit={handleSaveCredentials} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
                    Nombre del Dueño:
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
                    Correo Electrónico:
                  </label>
                  <input
                    type="text"
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
                    Nueva Contraseña:
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

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingCreds}
                  className="px-5 py-2.5 rounded-xl bg-inverse-surface text-inverse-on-surface font-headline text-xs font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[16px]">key</span>
                  <span>Actualizar Credenciales</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: REGLAS DE PRECIO (FASE 6) */}
      {activeTab === 'pricing' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-headline font-bold text-on-surface">Reglas de Precio & Promociones</h2>
              <p className="text-xs text-on-surface-variant">Configura descuentos automáticos según tipo de entrega, medio de pago o subtotal</p>
            </div>
            <button
              onClick={() => setShowNewRuleModal(true)}
              className="px-3.5 py-2 rounded-xl bg-primary text-white text-xs font-headline font-bold flex items-center gap-1.5 shadow-sm hover:bg-primary/90 transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Nueva Regla</span>
            </button>
          </div>

          {loadingRules ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              {pricingRules.map((rule) => (
                <div
                  key={rule.id}
                  className="bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/30 flex items-center justify-between shadow-sm"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-headline font-bold text-xs text-on-surface">{rule.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-mono">
                        Prioridad {rule.priority}
                      </span>
                      {rule.stackable && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary-container/40 text-secondary font-bold">
                          Acumulable
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-on-surface-variant flex items-center gap-3">
                      <span>Tipo: <strong className="text-on-surface">{rule.kind}</strong></span>
                      {rule.percent && <span>Descuento: <strong className="text-primary">{rule.percent}%</strong></span>}
                      {rule.amount && <span>Monto: <strong className="text-primary">${Number(rule.amount).toLocaleString('es-AR')}</strong></span>}
                      {rule.minSubtotal && <span>Mínimo: ${Number(rule.minSubtotal).toLocaleString('es-AR')}</span>}
                      {rule.deliveryTypes?.length > 0 && <span>Entrega: {rule.deliveryTypes.join(', ')}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleRule(rule.id, rule.active)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-headline font-bold flex items-center gap-1 transition-all ${
                        rule.active
                          ? 'bg-tertiary-container/30 text-tertiary hover:bg-tertiary-container/50'
                          : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {rule.active ? 'toggle_on' : 'toggle_off'}
                      </span>
                      <span>{rule.active ? 'Activa' : 'Pausada'}</span>
                    </button>
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-1.5 text-outline hover:text-error rounded-lg hover:bg-error-container/30 transition-all"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Modal Crear Regla */}
          {showNewRuleModal && (
            <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
              <div className="bg-surface-container-lowest rounded-2xl max-w-lg w-full p-5 border border-outline-variant/30 shadow-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-headline font-bold text-sm text-on-surface">Crear Regla de Precio</h3>
                  <button onClick={() => setShowNewRuleModal(false)} className="text-outline hover:text-on-surface">
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>

                <form onSubmit={handleCreateRule} className="space-y-4">
                  <div>
                    <label className="block text-xs font-headline font-semibold text-on-surface mb-1">Nombre de la Regla:</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Descuento Take Away 15%"
                      value={newRuleForm.name}
                      onChange={(e) => setNewRuleForm({ ...newRuleForm, name: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-headline font-semibold text-on-surface mb-1">Tipo de Descuento:</label>
                      <select
                        value={newRuleForm.kind}
                        onChange={(e) => setNewRuleForm({ ...newRuleForm, kind: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary"
                      >
                        <option value="PERCENT_ORDER">Porcentaje sobre Orden (%)</option>
                        <option value="AMOUNT_ORDER">Monto Fijo sobre Orden ($)</option>
                        <option value="FREE_SHIPPING">Envío Gratis</option>
                      </select>
                    </div>

                    {newRuleForm.kind === 'PERCENT_ORDER' ? (
                      <div>
                        <label className="block text-xs font-headline font-semibold text-on-surface mb-1">Porcentaje (%):</label>
                        <input
                          type="number"
                          value={newRuleForm.percent}
                          onChange={(e) => setNewRuleForm({ ...newRuleForm, percent: Number(e.target.value) })}
                          className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-headline font-semibold text-on-surface mb-1">Monto ($):</label>
                        <input
                          type="number"
                          value={newRuleForm.amount}
                          onChange={(e) => setNewRuleForm({ ...newRuleForm, amount: Number(e.target.value) })}
                          className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-headline font-semibold text-on-surface mb-1">Tipo de Entrega:</label>
                      <select
                        value={newRuleForm.deliveryType}
                        onChange={(e) => setNewRuleForm({ ...newRuleForm, deliveryType: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary"
                      >
                        <option value="ALL">Cualquiera (Delivery y Take Away)</option>
                        <option value="TAKE_AWAY">Solo Retiro en Local</option>
                        <option value="DELIVERY">Solo Delivery</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-headline font-semibold text-on-surface mb-1">Medio de Pago:</label>
                      <select
                        value={newRuleForm.paymentMethod}
                        onChange={(e) => setNewRuleForm({ ...newRuleForm, paymentMethod: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary"
                      >
                        <option value="ALL">Cualquiera</option>
                        <option value="EFECTIVO">Solo Efectivo</option>
                        <option value="TRANSFERENCIA">Solo Transferencia</option>
                        <option value="MERCADO_PAGO">Solo Mercado Pago</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-headline font-semibold text-on-surface mb-1">Subtotal Mínimo ($):</label>
                      <input
                        type="number"
                        value={newRuleForm.minSubtotal}
                        onChange={(e) => setNewRuleForm({ ...newRuleForm, minSubtotal: Number(e.target.value) })}
                        placeholder="0 para sin mínimo"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-headline font-semibold text-on-surface mb-1">Prioridad (1-100):</label>
                      <input
                        type="number"
                        value={newRuleForm.priority}
                        onChange={(e) => setNewRuleForm({ ...newRuleForm, priority: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="stackableCheck"
                      checked={newRuleForm.stackable}
                      onChange={(e) => setNewRuleForm({ ...newRuleForm, stackable: e.target.checked })}
                      className="rounded text-primary"
                    />
                    <label htmlFor="stackableCheck" className="text-xs text-on-surface">
                      Es acumulable con otras promociones
                    </label>
                  </div>

                  <div className="flex justify-end gap-2 pt-3">
                    <button
                      type="button"
                      onClick={() => setShowNewRuleModal(false)}
                      className="px-4 py-2 rounded-xl text-xs font-headline font-bold text-on-surface-variant hover:bg-surface-container"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-primary text-white text-xs font-headline font-bold hover:bg-primary/90"
                    >
                      Guardar Regla
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: FIDELIDAD & PUNTOS (FASE 7) */}
      {activeTab === 'loyalty' && (
        <div className="space-y-6">
          <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary-container/40 text-secondary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">loyalty</span>
                </div>
                <div>
                  <h3 className="font-headline font-bold text-sm text-on-surface">Programa de Puntos Yankun Club</h3>
                  <p className="text-xs text-on-surface-variant">Premia la fidelidad de tus clientes con puntos canjeables en cada comanda</p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={loyaltyEnabled}
                  onChange={(e) => setLoyaltyEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-outline-variant after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-headline font-semibold text-on-surface mb-1">Monto de compra para 1 punto:</label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-on-surface-variant font-bold">$</span>
                  <input
                    type="number"
                    value={amountPerPoint}
                    onChange={(e) => setAmountPerPoint(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface"
                  />
                </div>
                <span className="text-[10px] text-on-surface-variant">Por defecto: $1.000 gastados = 1 punto</span>
              </div>

              <div>
                <label className="block text-xs font-headline font-semibold text-on-surface mb-1">Valor de canje por cada punto:</label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-on-surface-variant font-bold">$</span>
                  <input
                    type="number"
                    value={pointValue}
                    onChange={(e) => setPointValue(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface"
                  />
                </div>
                <span className="text-[10px] text-on-surface-variant">Por defecto: 1 punto = $50 ARS (100 puntos = $5.000)</span>
              </div>

              <div>
                <label className="block text-xs font-headline font-semibold text-on-surface mb-1">Mínimo de puntos para canjear:</label>
                <input
                  type="number"
                  value={minRedeem}
                  onChange={(e) => setMinRedeem(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface"
                />
              </div>

              <div>
                <label className="block text-xs font-headline font-semibold text-on-surface mb-1">Tope máximo de canje (% del subtotal):</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={maxRedeemPct}
                    onChange={(e) => setMaxRedeemPct(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface"
                  />
                  <span className="text-xs text-on-surface-variant font-bold">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Niveles de Fidelidad */}
          <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30 space-y-3">
            <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-primary">military_tech</span>
              Niveles de Clientes & Multiplicadores
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-surface-container border border-outline-variant/30 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Nivel 1</span>
                <h4 className="font-headline font-bold text-sm text-on-surface">BRONCE</h4>
                <p className="text-xs text-on-surface-variant">Base para todos los clientes nuevos.</p>
                <p className="text-xs font-bold text-primary mt-2">Multiplicador: 1.0x</p>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-container border border-outline-variant/30 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Nivel 2</span>
                <h4 className="font-headline font-bold text-sm text-on-surface">PLATA</h4>
                <p className="text-xs text-on-surface-variant">Compras &gt; $60.000 en 90 días.</p>
                <p className="text-xs font-bold text-primary mt-2">Multiplicador: 1.25x (+25%)</p>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-container border border-outline-variant/30 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Nivel 3</span>
                <h4 className="font-headline font-bold text-sm text-on-surface">ORO (VIP)</h4>
                <p className="text-xs text-on-surface-variant">Compras &gt; $150.000 en 90 días.</p>
                <p className="text-xs font-bold text-primary mt-2">Multiplicador: 1.50x (+50%)</p>
              </div>
            </div>
          </div>

          {/* Simulador de Puntos */}
          <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30 space-y-4">
            <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-primary">calculate</span>
              Simulador de Acumulación en Vivo
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-headline font-semibold text-on-surface mb-1">Gasto del Pedido ($):</label>
                <input
                  type="number"
                  step="1000"
                  value={simSpend}
                  onChange={(e) => setSimSpend(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface"
                />
              </div>

              <div>
                <label className="block text-xs font-headline font-semibold text-on-surface mb-1">Nivel del Cliente:</label>
                <select
                  value={simTier}
                  onChange={(e) => setSimTier(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface"
                >
                  <option value="BRONCE">BRONCE (1.0x)</option>
                  <option value="PLATA">PLATA (1.25x)</option>
                  <option value="ORO">ORO (1.50x)</option>
                </select>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between">
              <div>
                <span className="text-xs text-on-surface-variant block">Puntos a Acreditar:</span>
                <span className="text-xl font-headline font-bold text-primary">{simEarnedPoints} Puntos</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-on-surface-variant block">Equivalente en Descuento:</span>
                <span className="text-xl font-headline font-bold text-tertiary">${simValueARS.toLocaleString('es-AR')}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
