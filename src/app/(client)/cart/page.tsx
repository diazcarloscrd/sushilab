'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/client/Header';
import BottomNav from '@/components/client/BottomNav';
import { useCartStore } from '@/lib/store/useCartStore';
import { findMatchingDeliveryZone } from '@/lib/geo';

export default function CartPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [zones, setZones] = useState<any[]>([]);
  const [bankInfo, setBankInfo] = useState<any>({
    alias: 'YANKUN.SUSHI.BBLA',
    cbu: '0000003100012345678901',
    holder: 'Yankun Gastronomia SRL',
  });
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'MERCADO_PAGO' | 'TRANSFERENCIA' | 'EFECTIVO'>('MERCADO_PAGO');
  const [paymentProofUrl, setPaymentProofUrl] = useState<string | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [cashAmount, setCashAmount] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [scheduledOption, setScheduledOption] = useState<'ASAP' | 'SCHEDULED'>('ASAP');
  const [scheduledTime, setScheduledTime] = useState('21:00');
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [loyaltyBalance, setLoyaltyBalance] = useState<{ points: number; tier: string; pointValue: number; minRedeemPoints: number } | null>(null);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpNotice, setOtpNotice] = useState('');
  const [redeemToken, setRedeemToken] = useState<string | null>(null);
  const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);
  const [quoteData, setQuoteData] = useState<any>(null);

  const {
    items,
    deliveryType,
    deliveryFee,
    deliveryZoneId,
    deliveryZoneName,
    appliedCoupon,
    customer,
    updateQuantity,
    removeItem,
    clearCart,
    setDeliveryType,
    setDeliveryZone,
    setCouponDiscount,
    removeCoupon,
    setCustomer,
    getSubtotal,
    getDiscount,
    getTotal,
  } = useCartStore();

  useEffect(() => {
    setMounted(true);
    async function loadInitialData() {
      try {
        const [zonesRes, settingsRes] = await Promise.all([
          fetch('/api/zones'),
          fetch('/api/settings/public'),
        ]);

        if (zonesRes.ok) {
          const zData = await zonesRes.json();
          setZones(zData);
          // Si no hay zona asignada y hay zonas de Bahía Blanca, asignar la primera (Centro)
          if (!deliveryZoneId && zData.length > 0) {
            setDeliveryZone(zData[0].id, zData[0].name, zData[0].deliveryFee);
          }
        }

        if (settingsRes.ok) {
          const sData = await settingsRes.json();
          if (sData.bankDetails) setBankInfo(sData.bankDetails);
        }
      } catch (e) {
        console.error('Error cargando datos de checkout:', e);
      }
    }
    loadInitialData();
  }, [deliveryZoneId, setDeliveryZone]);

  // Cargar saldo de fidelidad si se ingresa teléfono
  useEffect(() => {
    if (customer.phone && customer.phone.trim().length >= 8) {
      fetch(`/api/loyalty/balance?phone=${encodeURIComponent(customer.phone.trim())}`)
        .then((r) => r.json())
        .then((data) => {
          if (data && data.points !== undefined) {
            setLoyaltyBalance(data);
          }
        })
        .catch(() => {});
    }
  }, [customer.phone]);

  // Cotización en vivo con motor de reglas y servidor (Debounce 400ms)
  useEffect(() => {
    if (!mounted || items.length === 0) return;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/cart/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items,
            deliveryType,
            paymentMethod,
            deliveryZoneId,
            couponCode: appliedCoupon,
            customerPhone: customer.phone,
            pointsToRedeem: redeemToken ? pointsToRedeem : 0,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setQuoteData(data);
        }
      } catch (e) {
        console.error('Error fetching live quote:', e);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [mounted, items, deliveryType, paymentMethod, deliveryZoneId, appliedCoupon, customer.phone, redeemToken, pointsToRedeem]);

  const handleRequestOtp = async () => {
    if (!customer.phone || customer.phone.trim().length < 8) {
      setErrorMessage('Ingresa un número de WhatsApp válido para recibir el código');
      return;
    }
    setSendingOtp(true);
    setOtpNotice('');
    try {
      const res = await fetch('/api/loyalty/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: customer.phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error enviando código');
      setShowOtpInput(true);
      setOtpNotice(data.devCode ? `Código dev: ${data.devCode}` : 'Código enviado a tu WhatsApp');
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al solicitar código OTP');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.trim().length !== 6) {
      setErrorMessage('Ingresa el código de 6 dígitos');
      return;
    }
    setVerifyingOtp(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/loyalty/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: customer.phone.trim(), code: otpCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Código incorrecto');
      setRedeemToken(data.redeemToken);
      if (loyaltyBalance) {
        setPointsToRedeem(loyaltyBalance.points);
      }
      setShowOtpInput(false);
      setOtpNotice('¡Puntos validados para este pedido!');
    } catch (err: any) {
      setErrorMessage(err.message || 'Error validando código');
    } finally {
      setVerifyingOtp(false);
    }
  };

  if (!mounted) return null;

  const subtotal = getSubtotal();
  const discount = getDiscount();
  const total = getTotal();

  // Geolocalización real para Bahía Blanca usando Nominatim (OpenStreetMap)
  const handleAddressGeocode = async (addressText: string) => {
    setCustomer({ address: addressText });
    if (!addressText.trim() || addressText.length < 4) return;

    setGeocoding(true);
    try {
      // Buscar dirección en Bahía Blanca
      const query = encodeURIComponent(`${addressText}, Bahía Blanca, Buenos Aires, Argentina`);
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${query}`);
      if (res.ok) {
        const results = await res.json();
        if (results && results.length > 0) {
          const point = {
            lat: parseFloat(results[0].lat),
            lng: parseFloat(results[0].lon),
          };
          setCustomer({ lat: point.lat, lng: point.lng });

          if (zones.length > 0) {
            const match = findMatchingDeliveryZone(point, zones);
            if (match) {
              setDeliveryZone(match.id, match.name, match.deliveryFee);
            }
          }
        }
      }
    } catch (e) {
      console.warn('Geocodificación no disponible, usando fallback manual de zona:', e);
    } finally {
      setGeocoding(false);
    }
  };

  // Botón GPS: "Usar mi ubicación actual en Bahía Blanca"
  const handleUseCurrentGPS = () => {
    if (!navigator.geolocation) {
      setErrorMessage('Tu navegador no soporta geolocalización.');
      return;
    }

    setGeocoding(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCustomer({ lat: point.lat, lng: point.lng });

        if (zones.length > 0) {
          const match = findMatchingDeliveryZone(point, zones);
          if (match) {
            setDeliveryZone(match.id, match.name, match.deliveryFee);
            setCustomer({ address: `Ubicación GPS: (${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}) - Bahía Blanca` });
          } else {
            setErrorMessage('Tu ubicación GPS está fuera del radio de entrega de Bahía Blanca.');
          }
        }
        setGeocoding(false);
      },
      (err) => {
        setErrorMessage('No pudimos acceder a tu GPS. Por favor escribe tu dirección o elige el barrio.');
        setGeocoding(false);
      }
    );
  };

  // Validación real de cupón contra /api/coupons/validate
  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;

    setCouponError('');
    setCouponSuccess('');

    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponInput, subtotal }),
      });

      const data = await res.json();
      if (!res.ok || !data.valid) {
        setCouponError(data.message || 'Cupón inválido o expirado');
      } else {
        setCouponDiscount(data.code, data.discountPercent);
        setCouponSuccess(data.message);
        setCouponInput('');
      }
    } catch {
      setCouponError('Error al validar cupón con el servidor');
    }
  };

  // Subida segura del comprobante a Supabase Storage
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingProof(true);
    setErrorMessage('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al subir comprobante');
      }

      const { url } = await res.json();
      setPaymentProofUrl(url);
    } catch (err: any) {
      setErrorMessage(err.message || 'No se pudo subir la foto del comprobante');
    } finally {
      setUploadingProof(false);
    }
  };

  const handleCreateOrder = async () => {
    if (items.length === 0) return;

    if (!customer.name.trim()) {
      setErrorMessage('Por favor ingresa tu Nombre y Apellido.');
      return;
    }
    if (!customer.phone.trim()) {
      setErrorMessage('Por favor ingresa tu número de WhatsApp para el seguimiento.');
      return;
    }
    if (deliveryType === 'DELIVERY' && !customer.address.trim()) {
      setErrorMessage('Por favor especifica tu dirección completa de entrega en Bahía Blanca.');
      return;
    }
    if (paymentMethod === 'TRANSFERENCIA' && !paymentProofUrl) {
      setErrorMessage('Por favor adjunta la captura del comprobante de transferencia bancaria.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const scheduledForDate = scheduledOption === 'SCHEDULED'
        ? new Date(new Date().setHours(parseInt(scheduledTime.split(':')[0]), parseInt(scheduledTime.split(':')[1]), 0)).toISOString()
        : null;

      const orderPayload = {
        customerName: customer.name.trim(),
        customerPhone: customer.phone.trim(),
        deliveryType,
        deliveryAddress: deliveryType === 'DELIVERY' ? customer.address : 'Retiro en Local (Alsina 350, Bahía Blanca)',
        deliveryZoneId: deliveryType === 'DELIVERY' ? deliveryZoneId : null,
        paymentMethod,
        paymentProofUrl,
        couponCode: appliedCoupon,
        notes: customer.notes || '',
        scheduledFor: scheduledForDate,
        cashAmountPaid: paymentMethod === 'EFECTIVO' && cashAmount ? parseFloat(cashAmount) : null,
        marketingConsent,
        pointsToRedeem: redeemToken ? pointsToRedeem : 0,
        redeemToken: redeemToken || null,
        items: items.map((i) => ({
          productId: i.productId,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          baseRice: i.baseRice,
          saucesJson: JSON.stringify(i.sauces),
          extrasJson: JSON.stringify(i.extras),
          notes: i.notes || '',
        })),
      };

      // 1. Crear comanda en servidor con recálculo de precios seguro
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Error al procesar el pedido');
      }

      const createdOrder = await res.json();

      // 2. Si el método es Mercado Pago, generar la preferencia y redirigir al checkout oficial
      if (paymentMethod === 'MERCADO_PAGO') {
        const mpRes = await fetch('/api/payments/mercadopago', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: createdOrder.id,
            orderNumber: createdOrder.orderNumber,
            items: items.map((i) => ({
              productId: i.productId,
              name: i.name,
              price: i.price,
              quantity: i.quantity,
            })),
            total: createdOrder.total,
            customerEmail: customer.phone ? `${customer.phone.replace(/[^0-9]/g, '')}@cliente.yankunsushi.com` : 'cliente@yankunsushi.com',
          }),
        });

        if (mpRes.ok) {
          const mpData = await mpRes.json();
          if (mpData.init_point) {
            clearCart();
            window.location.href = mpData.init_point;
            return;
          }
        }
      }

      // 3. Para efectivo o transferencia, limpiar carrito y redirigir al tracker de la comanda
      clearCart();
      router.push(`/pedido/${createdOrder.id}`);
    } catch (err: any) {
      console.error('Error creando orden:', err);
      setErrorMessage(err.message || 'Error al conectar con la cocina. Intenta nuevamente.');
      setIsSubmitting(false);
    }
  };

  const calculatedCashChange = paymentMethod === 'EFECTIVO' && cashAmount && parseFloat(cashAmount) > total
    ? parseFloat(cashAmount) - total
    : 0;

  return (
    <div className="bg-surface min-h-screen pb-28">
      <Header />

      <main className="pt-20 px-4 max-w-xl mx-auto space-y-6">
        {/* Header title */}
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
          <div>
            <span className="font-headline text-[11px] uppercase tracking-wider text-secondary font-bold">
              Bahía Blanca • Checkout Shokunin
            </span>
            <h1 className="font-headline font-bold text-2xl text-on-surface">
              Tu Comanda
            </h1>
          </div>
          <span className="text-xs text-on-surface-variant font-medium">
            {items.reduce((s, i) => s + i.quantity, 0)} piezas/rolls
          </span>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-error-container text-on-error-container text-xs font-headline font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {items.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-2xl p-10 text-center border border-outline-variant/30 space-y-4">
            <span className="material-symbols-outlined text-4xl text-outline">shopping_bag</span>
            <h3 className="font-headline font-bold text-base text-on-surface">
              Tu carrito está vacío
            </h3>
            <p className="text-xs text-on-surface-variant">
              Explora nuestra carta artesanal de rolls y piezas Edo para comenzar.
            </p>
            <Link
              href="/"
              className="inline-block px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-headline font-bold shadow-sm"
            >
              Ver Carta en Bahía Blanca
            </Link>
          </div>
        ) : (
          <>
            {/* Lista de Items */}
            <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-card border border-outline-variant/30 divide-y divide-outline-variant/15">
              {items.map((item) => (
                <div key={item.cartItemId} className="py-3 first:pt-0 last:pb-0 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-headline font-bold text-xs text-on-surface leading-tight">
                        {item.name}
                      </h4>
                      <span className="font-headline font-bold text-xs text-primary flex-shrink-0">
                        ${(item.price * item.quantity).toLocaleString('es-AR')}
                      </span>
                    </div>

                    {item.baseRice && (
                      <span className="text-[10px] text-tertiary font-medium block mt-0.5">
                        🍚 {item.baseRice}
                      </span>
                    )}

                    {item.extras && item.extras.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.extras.map((ex) => (
                          <span
                            key={ex.id}
                            className="text-[9px] bg-tertiary-container/30 text-on-tertiary-container px-1.5 py-0.2 rounded font-medium"
                          >
                            + {ex.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Selector de cantidad */}
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center border border-outline-variant/40 rounded-lg overflow-hidden bg-surface-container">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.cartItemId, -1)}
                          className="w-6 h-6 flex items-center justify-center text-xs font-bold text-on-surface-variant hover:bg-surface-container-high"
                        >
                          -
                        </button>
                        <span className="w-7 text-center text-xs font-headline font-bold">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.cartItemId, 1)}
                          className="w-6 h-6 flex items-center justify-center text-xs font-bold text-on-surface-variant hover:bg-surface-container-high"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item.cartItemId)}
                        className="text-[11px] text-error hover:underline font-medium"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Modalidad de Entrega */}
            <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-card border border-outline-variant/30 space-y-3">
              <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface-variant">
                Modalidad de Entrega (Bahía Blanca)
              </h3>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDeliveryType('DELIVERY')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    deliveryType === 'DELIVERY'
                      ? 'border-primary bg-primary/5 text-primary font-bold'
                      : 'border-outline-variant/40 bg-surface-container text-on-surface-variant'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px] block mb-1">moped</span>
                  <span className="text-xs font-headline block">Envío a Domicilio</span>
                  <span className="text-[10px] opacity-75">30-45 min</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDeliveryType('TAKE_AWAY')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    deliveryType === 'TAKE_AWAY'
                      ? 'border-secondary bg-secondary-container/20 text-on-secondary-container font-bold'
                      : 'border-outline-variant/40 bg-surface-container text-on-surface-variant'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px] block mb-1">storefront</span>
                  <span className="text-xs font-headline block">Retiro en Local</span>
                  <span className="text-[10px] text-secondary font-bold">15% Descuento</span>
                </button>
              </div>

              {deliveryType === 'DELIVERY' ? (
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
                      Dirección en Bahía Blanca:
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={customer.address}
                        onChange={(e) => handleAddressGeocode(e.target.value)}
                        placeholder="Ej. Alsina 450, Barrio Universitario, Bahía Blanca"
                        className="w-full pl-3.5 pr-10 py-2.5 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary"
                      />
                      {geocoding && (
                        <div className="absolute right-3 top-3 w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={handleUseCurrentGPS}
                      className="text-[11px] text-primary hover:underline font-headline font-bold flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">my_location</span>
                      <span>Usar mi ubicación GPS actual</span>
                    </button>

                    {/* Selector de zona asistido */}
                    <select
                      value={deliveryZoneId || ''}
                      onChange={(e) => {
                        const z = zones.find((item) => item.id === e.target.value);
                        if (z) setDeliveryZone(z.id, z.name, z.deliveryFee);
                      }}
                      className="text-xs bg-surface-container border border-outline-variant/40 rounded-lg px-2 py-1 text-on-surface focus:outline-none"
                    >
                      {zones.map((z) => (
                        <option key={z.id} value={z.id}>
                          {z.name} (${z.deliveryFee})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-secondary-container/20 text-xs text-on-surface space-y-1">
                  <span className="font-headline font-bold text-secondary block">
                    📍 Dirección de Retiro:
                  </span>
                  <p>Alsina 350, Centro, Bahía Blanca</p>
                  <p className="text-[10px] text-on-surface-variant">
                    Demora estimada de preparación: 20-25 minutos.
                  </p>
                </div>
              )}
            </div>

            {/* Horario de Entrega / Pedido Programado */}
            <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-card border border-outline-variant/30 space-y-3">
              <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-primary">schedule</span>
                Horario de Entrega
              </h3>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setScheduledOption('ASAP')}
                  className={`p-2.5 rounded-xl border text-xs font-headline font-bold transition-all ${
                    scheduledOption === 'ASAP'
                      ? 'border-primary bg-primary text-white shadow-sm'
                      : 'border-outline-variant/40 bg-surface-container text-on-surface-variant'
                  }`}
                >
                  Lo antes posible (35-45m)
                </button>

                <button
                  type="button"
                  onClick={() => setScheduledOption('SCHEDULED')}
                  className={`p-2.5 rounded-xl border text-xs font-headline font-bold transition-all ${
                    scheduledOption === 'SCHEDULED'
                      ? 'border-primary bg-primary text-white shadow-sm'
                      : 'border-outline-variant/40 bg-surface-container text-on-surface-variant'
                  }`}
                >
                  Programar para hoy
                </button>
              </div>

              {scheduledOption === 'SCHEDULED' && (
                <div className="pt-2">
                  <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
                    Selecciona horario estimado de entrega:
                  </label>
                  <select
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface font-headline font-bold"
                  >
                    <option value="20:00">20:00 hs</option>
                    <option value="20:30">20:30 hs</option>
                    <option value="21:00">21:00 hs</option>
                    <option value="21:30">21:30 hs</option>
                    <option value="22:00">22:00 hs</option>
                    <option value="22:30">22:30 hs</option>
                    <option value="23:00">23:00 hs</option>
                  </select>
                </div>
              )}
            </div>

            {/* Datos del Cliente */}
            <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-card border border-outline-variant/30 space-y-3">
              <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface-variant">
                Datos de Contacto
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
                    Nombre y Apellido:
                  </label>
                  <input
                    type="text"
                    value={customer.name}
                    onChange={(e) => setCustomer({ name: e.target.value })}
                    placeholder="Ej. Martín González"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
                    WhatsApp (para seguimiento del repartidor):
                  </label>
                  <input
                    type="tel"
                    value={customer.phone}
                    onChange={(e) => setCustomer({ phone: e.target.value })}
                    placeholder="Ej. +5492914445566"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary"
                  />
                  <div className="flex items-center gap-2 pt-1.5">
                    <input
                      type="checkbox"
                      id="marketingConsentCheck"
                      checked={marketingConsent}
                      onChange={(e) => setMarketingConsent(e.target.checked)}
                      className="rounded text-primary focus:ring-primary w-4 h-4 bg-surface-container"
                    />
                    <label htmlFor="marketingConsentCheck" className="text-[11px] text-on-surface-variant cursor-pointer">
                      Quiero recibir promociones exclusivas y novedades por WhatsApp
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
                    Notas adicionales o aclaraciones:
                  </label>
                  <input
                    type="text"
                    value={customer.notes || ''}
                    onChange={(e) => setCustomer({ notes: e.target.value })}
                    placeholder="Ej. Tocar timbre 4B, sin wasabi, salsa soja extra..."
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* Medios de Pago */}
            <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-card border border-outline-variant/30 space-y-3">
              <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface-variant">
                Medio de Pago
              </h3>

              <div className="space-y-2">
                {/* Mercado Pago */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('MERCADO_PAGO')}
                  className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                    paymentMethod === 'MERCADO_PAGO'
                      ? 'border-primary bg-primary/5 text-primary font-bold'
                      : 'border-outline-variant/40 bg-surface-container text-on-surface-variant'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[20px]">credit_card</span>
                    <div>
                      <span className="text-xs font-headline block">Mercado Pago (Tarjetas, Débito, Dinero en cuenta)</span>
                      <span className="text-[10px] opacity-75">Acreditación instantánea</span>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-[18px]">
                    {paymentMethod === 'MERCADO_PAGO' ? 'radio_button_checked' : 'radio_button_unchecked'}
                  </span>
                </button>

                {/* Transferencia */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('TRANSFERENCIA')}
                  className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                    paymentMethod === 'TRANSFERENCIA'
                      ? 'border-secondary bg-secondary-container/20 text-on-secondary-container font-bold'
                      : 'border-outline-variant/40 bg-surface-container text-on-surface-variant'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[20px]">account_balance</span>
                    <div>
                      <span className="text-xs font-headline block">Transferencia Bancaria Directa</span>
                      <span className="text-[10px] text-secondary font-bold">Sin comisiones adicionales</span>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-[18px]">
                    {paymentMethod === 'TRANSFERENCIA' ? 'radio_button_checked' : 'radio_button_unchecked'}
                  </span>
                </button>

                {paymentMethod === 'TRANSFERENCIA' && (
                  <div className="p-3.5 rounded-xl bg-surface-container border border-outline-variant/40 space-y-3 text-xs">
                    <div className="space-y-1">
                      <span className="text-[11px] font-headline font-bold text-on-surface block">
                        Datos para transferir:
                      </span>
                      <p>Alias: <strong className="font-mono text-primary">{bankInfo.alias}</strong></p>
                      <p>CBU: <span className="font-mono text-on-surface-variant">{bankInfo.cbu}</span></p>
                      <p>Titular: {bankInfo.holder}</p>
                    </div>

                    <div>
                      <label className="block text-[11px] font-headline font-bold text-on-surface mb-1">
                        Adjuntar comprobante de transferencia:
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="text-xs text-on-surface-variant file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-headline file:font-bold file:bg-primary file:text-white"
                      />
                      {uploadingProof && (
                        <span className="text-[10px] text-primary block mt-1">Subiendo comprobante a Storage...</span>
                      )}
                      {paymentProofUrl && (
                        <span className="text-[10px] text-tertiary font-bold block mt-1">✓ Comprobante adjuntado correctamente</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Efectivo */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('EFECTIVO')}
                  className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                    paymentMethod === 'EFECTIVO'
                      ? 'border-tertiary bg-tertiary-container/20 text-on-tertiary-container font-bold'
                      : 'border-outline-variant/40 bg-surface-container text-on-surface-variant'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[20px]">payments</span>
                    <div>
                      <span className="text-xs font-headline block">Efectivo contra Entrega</span>
                      <span className="text-[10px] opacity-75">Abona al recibir</span>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-[18px]">
                    {paymentMethod === 'EFECTIVO' ? 'radio_button_checked' : 'radio_button_unchecked'}
                  </span>
                </button>

                {paymentMethod === 'EFECTIVO' && (
                  <div className="p-3 rounded-xl bg-surface-container border border-outline-variant/40 space-y-2">
                    <label className="block text-xs font-headline font-semibold text-on-surface">
                      ¿Con cuánto vas a pagar? (Para que el cadete lleve cambio):
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="font-headline font-bold text-xs">$</span>
                      <input
                        type="number"
                        value={cashAmount}
                        onChange={(e) => setCashAmount(e.target.value)}
                        placeholder={`Monto superior a $${total.toLocaleString('es-AR')}`}
                        className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-surface-container-high border border-outline-variant/50 text-on-surface focus:outline-none"
                      />
                    </div>
                    {calculatedCashChange > 0 && (
                      <span className="text-[11px] text-primary font-bold block">
                        Tu vuelto será de: ${calculatedCashChange.toLocaleString('es-AR')}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Cupones de Descuento */}
            <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-card border border-outline-variant/30 space-y-2">
              <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface-variant">
                Cupón de Descuento
              </h3>

              {appliedCoupon ? (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-tertiary-container/30 border border-tertiary/40">
                  <div className="flex items-center gap-2 text-xs font-headline font-bold text-on-tertiary-container">
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                    <span>Cupón {appliedCoupon} aplicado</span>
                  </div>
                  <button
                    type="button"
                    onClick={removeCoupon}
                    className="text-xs text-error font-bold hover:underline"
                  >
                    Quitar
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="Ingresa código (ej. KANSO15)"
                    className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface uppercase font-mono focus:outline-none focus:border-primary"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-headline font-bold transition-all"
                  >
                    Aplicar
                  </button>
                </form>
              )}

              {couponError && <p className="text-[10px] text-error font-semibold">{couponError}</p>}
              {couponSuccess && <p className="text-[10px] text-tertiary font-semibold">{couponSuccess}</p>}
            </div>

            {/* Fidelidad & Puntos Yankun Club (Fase 7) */}
            {loyaltyBalance && loyaltyBalance.points >= 100 && (
              <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-card border border-secondary/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-secondary">loyalty</span>
                    <span className="text-xs font-headline font-bold text-on-surface">Puntos Yankun Club</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-secondary-container/40 text-secondary uppercase">
                      {loyaltyBalance.tier}
                    </span>
                  </div>
                  <span className="text-xs font-headline font-bold text-primary">
                    {loyaltyBalance.points} pts (= ${(loyaltyBalance.points * 50).toLocaleString('es-AR')})
                  </span>
                </div>

                {redeemToken ? (
                  <div className="p-2.5 rounded-xl bg-tertiary-container/30 border border-tertiary/40 flex items-center justify-between text-xs font-headline font-bold text-on-tertiary-container">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      <span>Canje de puntos aplicado en tu comanda</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setRedeemToken(null);
                        setPointsToRedeem(0);
                      }}
                      className="text-error font-bold hover:underline"
                    >
                      Quitar
                    </button>
                  </div>
                ) : (
                  <div>
                    {!showOtpInput ? (
                      <button
                        type="button"
                        onClick={handleRequestOtp}
                        disabled={sendingOtp}
                        className="w-full py-2 px-3 rounded-xl bg-secondary text-on-secondary text-xs font-headline font-bold hover:opacity-90 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        {sendingOtp ? (
                          <span>Enviando código...</span>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-[16px]">key</span>
                            <span>Usar mis puntos (verificar por WhatsApp)</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="space-y-2 pt-1">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            maxLength={6}
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                            placeholder="Código de 6 dígitos"
                            className="flex-1 px-3 py-1.5 text-xs font-mono font-bold tracking-widest text-center rounded-xl bg-surface-container border border-outline-variant text-on-surface focus:outline-none focus:border-secondary"
                          />
                          <button
                            type="button"
                            onClick={handleVerifyOtp}
                            disabled={verifyingOtp}
                            className="px-4 py-1.5 rounded-xl bg-primary text-white text-xs font-headline font-bold hover:bg-primary/90 transition-all"
                          >
                            {verifyingOtp ? '...' : 'Validar'}
                          </button>
                        </div>
                        {otpNotice && <p className="text-[10px] text-primary font-medium">{otpNotice}</p>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Banner de Reglas Cercanas (Upsell / Beneficios) */}
            {quoteData?.nearRules && quoteData.nearRules.length > 0 && (
              <div className="p-3 rounded-xl bg-secondary-container/20 border border-secondary/30 text-secondary text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">lightbulb</span>
                <span className="font-medium">{quoteData.nearRules[0]}</span>
              </div>
            )}

            {/* Resumen de Total */}
            <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30 space-y-2.5 text-xs">
              <div className="flex justify-between text-on-surface-variant">
                <span>Subtotal:</span>
                <span>${(quoteData?.subtotal ?? subtotal).toLocaleString('es-AR')}</span>
              </div>

              {quoteData?.discounts && quoteData.discounts.length > 0 ? (
                quoteData.discounts.map((disc: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-secondary font-semibold">
                    <span>{disc.label}:</span>
                    <span>-${disc.amount.toLocaleString('es-AR')}</span>
                  </div>
                ))
              ) : discount > 0 ? (
                <div className="flex justify-between text-secondary font-semibold">
                  <span>Descuento aplicado:</span>
                  <span>-${discount.toLocaleString('es-AR')}</span>
                </div>
              ) : null}

              <div className="flex justify-between text-on-surface-variant">
                <span>Costo de envío ({deliveryType === 'TAKE_AWAY' ? 'Retiro Local' : deliveryZoneName || 'Bahía Blanca'}):</span>
                <span>
                  {deliveryType === 'TAKE_AWAY' || (quoteData?.deliveryFee ?? deliveryFee) === 0
                    ? 'Sin cargo'
                    : `$${(quoteData?.deliveryFee ?? deliveryFee).toLocaleString('es-AR')}`}
                </span>
              </div>

              <div className="pt-2 border-t border-outline-variant/30 flex justify-between items-baseline font-headline font-bold text-base text-on-surface">
                <span>Total a Pagar:</span>
                <span className="text-xl text-primary font-extrabold">
                  ${(quoteData?.total ?? total).toLocaleString('es-AR')}
                </span>
              </div>
            </div>

            {/* Botón de Confirmación */}
            <button
              type="button"
              onClick={handleCreateOrder}
              disabled={isSubmitting || uploadingProof}
              className="w-full py-4 rounded-2xl bg-primary text-white font-headline text-sm font-bold shadow-lg hover:bg-primary/95 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Enviando Comanda a Cocina...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">
                    {paymentMethod === 'MERCADO_PAGO' ? 'lock' : 'send'}
                  </span>
                  <span>
                    {paymentMethod === 'MERCADO_PAGO'
                      ? `Pagar $${total.toLocaleString('es-AR')} con Mercado Pago`
                      : `Confirmar Pedido ($${total.toLocaleString('es-AR')})`}
                  </span>
                </>
              )}
            </button>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
