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
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'MERCADO_PAGO' | 'TRANSFERENCIA' | 'EFECTIVO'>('MERCADO_PAGO');
  const [paymentProofFile, setPaymentProofFile] = useState<string | null>(null);
  const [cashAmount, setCashAmount] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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
    applyCoupon,
    removeCoupon,
    setCustomer,
    getSubtotal,
    getDiscount,
    getTotal,
  } = useCartStore();

  useEffect(() => {
    setMounted(true);
    async function loadZones() {
      try {
        const res = await fetch('/api/zones');
        if (res.ok) {
          const data = await res.json();
          setZones(data);
        }
      } catch (e) {
        console.error('Error cargando zonas:', e);
      }
    }
    loadZones();
  }, []);

  if (!mounted) return null;

  const subtotal = getSubtotal();
  const discount = getDiscount();
  const total = getTotal();

  // Test address coordinates with Ray-Casting
  const handleAddressChange = (addressText: string) => {
    setCustomer({ address: addressText });

    // Mock geolocation coordinates based on keywords if user writes an address
    let testPoint = { lat: -34.5885, lng: -58.4305 }; // Default Palermo
    if (addressText.toLowerCase().includes('recoleta')) {
      testPoint = { lat: -34.5900, lng: -58.3950 };
    } else if (addressText.toLowerCase().includes('belgrano')) {
      testPoint = { lat: -34.5650, lng: -58.4500 };
    }

    if (zones.length > 0) {
      const match = findMatchingDeliveryZone(testPoint, zones);
      if (match) {
        setDeliveryZone(match.id, match.name, match.deliveryFee);
      }
    }
  };

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput) return;
    const ok = applyCoupon(couponInput);
    if (ok) {
      setCouponError('');
      setCouponInput('');
    } else {
      setCouponError('Cupón inválido o vencido');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPaymentProofFile(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateOrder = async () => {
    if (items.length === 0) return;

    if (!customer.name.trim()) {
      setErrorMessage('Por favor ingresa tu Nombre y Apellido.');
      return;
    }
    if (!customer.phone.trim()) {
      setErrorMessage('Por favor ingresa tu número de WhatsApp / Teléfono para el seguimiento.');
      return;
    }
    if (deliveryType === 'DELIVERY' && !customer.address.trim()) {
      setErrorMessage('Por favor especifica tu dirección completa de entrega.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const orderPayload = {
        customerName: customer.name,
        customerPhone: customer.phone,
        deliveryType,
        deliveryAddress: deliveryType === 'DELIVERY' ? customer.address : 'Retiro en Local (Honduras 4850, Palermo Soho)',
        deliveryZoneId: deliveryType === 'DELIVERY' ? deliveryZoneId : null,
        deliveryFee: deliveryType === 'DELIVERY' ? deliveryFee : 0,
        subtotal,
        discount,
        total,
        paymentMethod,
        paymentProofUrl: paymentProofFile,
        notes: customer.notes || '',
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

      // Clear cart
      clearCart();

      // Redirect to live order tracking stepper
      router.push(`/pedido/${createdOrder.id}`);
    } catch (err: any) {
      console.error('Error creando orden:', err);
      setErrorMessage(err.message || 'Error al conectar con la cocina. Intenta nuevamente.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-surface min-h-screen pb-28">
      <Header />

      <main className="max-w-2xl mx-auto pt-20 px-4 space-y-4">
        {/* Title */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface hover:bg-surface-container-high transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            </Link>
            <h1 className="font-headline font-bold text-xl text-on-surface">
              Tu Comanda & Checkout
            </h1>
          </div>
          {items.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-primary font-headline font-semibold hover:underline"
            >
              Vaciar
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center gap-3 bg-surface-container-low rounded-2xl p-8 border border-outline-variant/30">
            <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-outline">
              <span className="material-symbols-outlined text-3xl">shopping_basket</span>
            </div>
            <h3 className="font-headline font-bold text-lg text-on-surface">
              Tu carrito está vacío
            </h3>
            <p className="text-xs text-on-surface-variant max-w-xs">
              Aún no has agregado ninguna pieza de autor. Explora nuestra carta y deleita tu paladar.
            </p>
            <Link
              href="/menu"
              className="mt-3 px-6 py-2.5 rounded-full bg-primary hover:bg-primary-container text-white font-headline font-bold text-xs shadow-sm transition-transform active:scale-95"
            >
              Ver Menú Shokunin
            </Link>
          </div>
        ) : (
          <>
            {/* 1. Item List */}
            <section className="bg-surface-container-lowest rounded-2xl p-4 shadow-card border border-outline-variant/30 space-y-3">
              <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface-variant">
                Piezas Seleccionadas ({items.length})
              </h3>
              <div className="divide-y divide-outline-variant/20">
                {items.map((item) => (
                  <div key={item.cartItemId} className="py-3 flex gap-3 items-start justify-between">
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-surface-container flex-shrink-0 border border-outline-variant/20">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    </div>

                    <div className="flex-1 min-w-0 pr-2">
                      <h4 className="font-headline font-bold text-xs text-on-surface leading-tight">
                        {item.name}
                      </h4>
                      {item.baseRice && (
                        <p className="text-[10px] text-secondary font-medium mt-0.5">
                          ✦ {item.baseRice}
                        </p>
                      )}
                      {item.sauces.length > 0 && (
                        <p className="text-[10px] text-on-surface-variant">
                          Salsas: {item.sauces.join(', ')}
                        </p>
                      )}
                      {item.extras.length > 0 && (
                        <p className="text-[10px] text-tertiary font-medium">
                          Extras: {item.extras.map((e) => e.name).join(', ')}
                        </p>
                      )}
                      {item.notes && (
                        <p className="text-[10px] text-primary italic">
                          Nota: {item.notes}
                        </p>
                      )}
                      <div className="font-headline font-bold text-xs text-on-surface mt-1">
                        ${(item.price * item.quantity).toLocaleString('es-AR')}
                      </div>
                    </div>

                    {/* Quantity Stepper */}
                    <div className="flex items-center bg-surface-container rounded-full p-0.5 border border-outline-variant/30 flex-shrink-0">
                      <button
                        onClick={() => updateQuantity(item.cartItemId, -1)}
                        className="w-6 h-6 rounded-full flex items-center justify-center text-on-surface hover:bg-surface-container-high transition-colors"
                      >
                        <span className="material-symbols-outlined text-[14px]">remove</span>
                      </button>
                      <span className="w-5 text-center font-headline font-bold text-xs text-on-surface">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.cartItemId, 1)}
                        className="w-6 h-6 rounded-full flex items-center justify-center bg-primary text-white hover:bg-primary-container transition-colors"
                      >
                        <span className="material-symbols-outlined text-[14px]">add</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 2. Delivery Mode Selector (Take Away 15% OFF vs Domicilio) */}
            <section className="bg-surface-container-lowest rounded-2xl p-4 shadow-card border border-outline-variant/30 space-y-3">
              <label className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface-variant block">
                Método de Entrega
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDeliveryType('DELIVERY')}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                    deliveryType === 'DELIVERY'
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-outline-variant/40 bg-surface-container-low hover:bg-surface-container'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px] text-primary">moped</span>
                  <span className="font-headline font-bold text-xs text-on-surface">A Domicilio</span>
                  <span className="text-[10px] text-on-surface-variant">25–35 min</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDeliveryType('TAKE_AWAY')}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                    deliveryType === 'TAKE_AWAY'
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-outline-variant/40 bg-surface-container-low hover:bg-surface-container'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px] text-secondary">takeout_dining</span>
                  <span className="font-headline font-bold text-xs text-on-surface">Retiro en Local</span>
                  <span className="text-[10px] bg-secondary-container text-on-secondary-container px-1.5 py-0.2 rounded-full font-bold">
                    15% OFF
                  </span>
                </button>
              </div>

              {/* Delivery Zone validation banner */}
              {deliveryType === 'DELIVERY' ? (
                <div className="space-y-2 pt-1">
                  <div>
                    <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
                      Dirección de entrega (CABA):
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-3 flex items-center text-primary pointer-events-none">
                        <span className="material-symbols-outlined text-[16px]">location_on</span>
                      </span>
                      <input
                        type="text"
                        value={customer.address}
                        onChange={(e) => handleAddressChange(e.target.value)}
                        placeholder="Ej: Honduras 4850, Palermo Soho"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-tertiary text-[16px]">check_circle</span>
                      <span className="font-headline font-medium text-on-surface">
                        {deliveryZoneName ? `Cobertura confirmada: ${deliveryZoneName}` : 'Cobertura confirmada en Palermo'}
                      </span>
                    </div>
                    <span className="font-headline font-bold text-primary">
                      ${deliveryFee.toLocaleString('es-AR')}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-secondary-container/20 border border-secondary/30 text-xs space-y-1">
                  <div className="font-headline font-bold text-on-secondary-container flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">storefront</span>
                    Punto de Retiro Yankun Lab:
                  </div>
                  <p className="text-on-surface-variant">
                    Honduras 4850, Palermo Soho, CABA. Te avisaremos cuando el Itamae termine tu comanda.
                  </p>
                </div>
              )}
            </section>

            {/* 3. Customer Info */}
            <section className="bg-surface-container-lowest rounded-2xl p-4 shadow-card border border-outline-variant/30 space-y-3">
              <label className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface-variant block">
                Datos del Comensal
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-headline font-medium text-on-surface mb-1">
                    Nombre y Apellido:
                  </label>
                  <input
                    type="text"
                    value={customer.name}
                    onChange={(e) => setCustomer({ name: e.target.value })}
                    placeholder="Ej: Sofía Martínez"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-headline font-medium text-on-surface mb-1">
                    WhatsApp / Teléfono:
                  </label>
                  <input
                    type="tel"
                    value={customer.phone}
                    onChange={(e) => setCustomer({ phone: e.target.value })}
                    placeholder="Ej: +54 9 11 2345 6789"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            </section>

            {/* 4. Payment Method */}
            <section className="bg-surface-container-lowest rounded-2xl p-4 shadow-card border border-outline-variant/30 space-y-3">
              <label className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface-variant block">
                Forma de Pago
              </label>

              <div className="space-y-2">
                {/* Mercado Pago */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('MERCADO_PAGO')}
                  className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                    paymentMethod === 'MERCADO_PAGO'
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-outline-variant/40 bg-surface-container-low hover:bg-surface-container'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-full bg-[#009EE3]/15 text-[#009EE3] flex items-center justify-center font-bold text-xs">
                      MP
                    </span>
                    <div>
                      <div className="font-headline font-semibold text-xs text-on-surface">
                        Mercado Pago (Tarjetas, Débito, Saldo)
                      </div>
                      <p className="text-[10px] text-on-surface-variant">
                        Acreditación instantánea y protegida
                      </p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-[18px] text-primary">
                    {paymentMethod === 'MERCADO_PAGO' ? 'radio_button_checked' : 'radio_button_unchecked'}
                  </span>
                </button>

                {/* Transferencia */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('TRANSFERENCIA')}
                  className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                    paymentMethod === 'TRANSFERENCIA'
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-outline-variant/40 bg-surface-container-low hover:bg-surface-container'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-full bg-secondary/15 text-secondary flex items-center justify-center font-bold text-xs">
                      <span className="material-symbols-outlined text-[18px]">account_balance</span>
                    </span>
                    <div>
                      <div className="font-headline font-semibold text-xs text-on-surface">
                        Transferencia Bancaria
                      </div>
                      <p className="text-[10px] text-on-surface-variant">
                        Alias: YANKUN.SUSHI.LAB (Cargar comprobante)
                      </p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-[18px] text-primary">
                    {paymentMethod === 'TRANSFERENCIA' ? 'radio_button_checked' : 'radio_button_unchecked'}
                  </span>
                </button>

                {paymentMethod === 'TRANSFERENCIA' && (
                  <div className="p-3 rounded-xl bg-surface-container text-xs space-y-2 border border-outline-variant/40">
                    <div className="text-[11px] text-on-surface space-y-0.5">
                      <p><strong>CBU:</strong> 0000003100012345678901</p>
                      <p><strong>Alias:</strong> YANKUN.SUSHI.LAB</p>
                      <p><strong>Titular:</strong> Yankun Gastronomia SRL</p>
                    </div>
                    <div>
                      <label className="block text-[10px] font-headline font-bold text-on-surface mb-1">
                        Adjuntar comprobante de transferencia:
                      </label>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleFileUpload}
                        className="text-xs file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-[10px] file:font-headline file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-container"
                      />
                      {paymentProofFile && (
                        <p className="text-[10px] text-tertiary font-bold mt-1">✓ Comprobante listo para enviar</p>
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
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-outline-variant/40 bg-surface-container-low hover:bg-surface-container'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-full bg-tertiary/15 text-tertiary flex items-center justify-center font-bold text-xs">
                      <span className="material-symbols-outlined text-[18px]">payments</span>
                    </span>
                    <div>
                      <div className="font-headline font-semibold text-xs text-on-surface">
                        Efectivo contra entrega
                      </div>
                      <p className="text-[10px] text-on-surface-variant">
                        Paga al recibir o al retirar
                      </p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-[18px] text-primary">
                    {paymentMethod === 'EFECTIVO' ? 'radio_button_checked' : 'radio_button_unchecked'}
                  </span>
                </button>
              </div>
            </section>

            {/* 5. Coupon code */}
            <section className="bg-surface-container-lowest rounded-2xl p-4 shadow-card border border-outline-variant/30 space-y-2">
              <label className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface-variant block">
                Cupón de Descuento
              </label>

              {appliedCoupon ? (
                <div className="p-2.5 rounded-xl bg-tertiary-container/20 border border-tertiary/40 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-tertiary font-headline font-bold">
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    <span>Cupón {appliedCoupon} aplicado (15% OFF)</span>
                  </div>
                  <button
                    onClick={removeCoupon}
                    className="text-[11px] text-primary font-headline font-bold hover:underline"
                  >
                    Quitar
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder="Ej: KANSO15"
                    className="flex-1 px-3 py-2 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface uppercase focus:outline-none focus:border-primary"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-secondary text-white font-headline text-xs font-bold hover:bg-secondary/90 transition-colors"
                  >
                    Aplicar
                  </button>
                </form>
              )}
              {couponError && <p className="text-[11px] text-error font-medium">{couponError}</p>}
            </section>

            {/* 6. Totals Breakdown */}
            <section className="bg-surface-container-lowest rounded-2xl p-4 shadow-card border border-outline-variant/30 space-y-2 text-xs">
              <div className="flex justify-between text-on-surface-variant">
                <span>Subtotal de piezas</span>
                <span className="font-headline font-semibold text-on-surface">
                  ${subtotal.toLocaleString('es-AR')}
                </span>
              </div>

              {discount > 0 && (
                <div className="flex justify-between text-tertiary font-medium">
                  <span>Descuento aplicado</span>
                  <span className="font-headline font-bold">-${discount.toLocaleString('es-AR')}</span>
                </div>
              )}

              {deliveryType === 'DELIVERY' && (
                <div className="flex justify-between text-on-surface-variant">
                  <span>Costo de envío ({deliveryZoneName || 'Palermo'})</span>
                  <span className="font-headline font-semibold text-on-surface">
                    ${deliveryFee.toLocaleString('es-AR')}
                  </span>
                </div>
              )}

              <hr className="border-outline-variant/30 my-1" />

              <div className="flex justify-between items-center text-sm pt-1">
                <span className="font-headline font-bold text-on-surface">Total a Pagar</span>
                <span className="font-headline font-bold text-lg text-primary">
                  ${total.toLocaleString('es-AR')}
                </span>
              </div>
            </section>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-error-container text-on-error-container text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">error</span>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* 7. Big Vermilion CTA */}
            <button
              type="button"
              onClick={handleCreateOrder}
              disabled={isSubmitting}
              className="w-full py-4 px-6 rounded-full bg-primary hover:bg-primary-container text-white font-headline font-bold text-base shadow-floating-bar flex items-center justify-between active:scale-[0.98] transition-all disabled:opacity-60"
            >
              <span>{isSubmitting ? 'Enviando a Cocina...' : 'Confirmar y Enviar Pedido'}</span>
              <span className="flex items-center gap-1 font-extrabold">
                ${total.toLocaleString('es-AR')}
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </span>
            </button>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
