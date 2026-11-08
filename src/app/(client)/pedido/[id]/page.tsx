'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import Header from '@/components/client/Header';
import BottomNav from '@/components/client/BottomNav';
import { supabase } from '@/lib/supabase';

interface OrderData {
  id: string;
  orderNumber: number;
  customerName: string;
  customerPhone: string;
  deliveryType: 'DELIVERY' | 'TAKE_AWAY';
  deliveryAddress: string;
  deliveryFee: number;
  subtotal: number;
  discount: number;
  total: number;
  status: 'PENDIENTE_PAGO' | 'PENDIENTE_VERIFICACION' | 'CREADO' | 'EN_COCINA' | 'LISTO' | 'EN_CAMINO' | 'ENTREGADO' | 'CANCELADO';
  paymentMethod: string;
  paymentStatus: string;
  estimatedMinutes: number;
  scheduledFor?: string | null;
  createdAt: string;
  items?: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    baseRice?: string;
    notes?: string;
  }>;
}

const STATUS_STEPS = [
  { key: 'CREADO', label: 'Comanda Recibida', desc: 'En cola del laboratorio', icon: 'receipt_long' },
  { key: 'EN_COCINA', label: 'En Preparación', desc: 'El Itamae elabora tus piezas', icon: 'skillet' },
  { key: 'LISTO', label: 'Listo en Mostrador', desc: 'Piezas empaquetadas y controladas', icon: 'inventory_2' },
  { key: 'EN_CAMINO', label: 'En Viaje', desc: 'Cadete en camino a tu domicilio', icon: 'moped' },
  { key: 'ENTREGADO', label: 'Entregado', desc: '¡Que disfrutes tu experiencia Yankun!', icon: 'task_alt' },
];

export default function OrderTrackingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const orderId = resolvedParams.id;

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [whatsappPhone, setWhatsappPhone] = useState('5492915556677');

  // Fetch order data
  const fetchOrder = async () => {
    try {
      const [orderRes, settingsRes] = await Promise.all([
        fetch(`/api/orders/${orderId}`),
        fetch('/api/settings/public'),
      ]);

      if (orderRes.ok) {
        const data = await orderRes.json();
        setOrder(data);
      }
      if (settingsRes.ok) {
        const sData = await settingsRes.json();
        if (sData.whatsapp) setWhatsappPhone(sData.whatsapp.replace(/[^0-9]/g, ''));
      }
    } catch (e) {
      console.error('Error fetching order:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();

    // Supabase Realtime subscription
    const channel = supabase
      .channel(`order_tracking_${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'Order',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          setOrder((prev) => (prev ? { ...prev, ...payload.new } : (payload.new as OrderData)));
        }
      )
      .subscribe();

    const interval = setInterval(fetchOrder, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [orderId]);

  if (loading) {
    return (
      <div className="bg-surface min-h-screen flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="font-headline font-semibold text-xs text-on-surface-variant">
          Localizando comanda en Bahía Blanca...
        </p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="bg-surface min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <Header />
        <span className="material-symbols-outlined text-4xl text-outline mb-2">error</span>
        <h2 className="font-headline font-bold text-lg text-on-surface">Comanda no encontrada</h2>
        <p className="text-xs text-on-surface-variant mt-1 max-w-xs">
          No pudimos localizar la comanda solicitada. Consulta por WhatsApp al local.
        </p>
        <Link
          href="/"
          className="mt-4 px-6 py-2.5 rounded-full bg-primary text-white font-headline font-bold text-xs"
        >
          Volver a la Carta
        </Link>
      </div>
    );
  }

  // Calculate active step index for stepper
  const getStepIndex = (st: OrderData['status']) => {
    if (st === 'PENDIENTE_PAGO' || st === 'PENDIENTE_VERIFICACION') return 0;
    if (st === 'CREADO') return 0;
    if (st === 'EN_COCINA') return 1;
    if (st === 'LISTO') return 2;
    if (st === 'EN_CAMINO') return 3;
    if (st === 'ENTREGADO') return 4;
    return -1;
  };

  const currentStepIndex = getStepIndex(order.status);

  return (
    <div className="bg-surface min-h-screen pb-28">
      <Header />

      <main className="max-w-xl mx-auto pt-20 px-4 space-y-4">
        {/* Order Status Header */}
        <section className="bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30 text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container font-headline font-bold text-xs uppercase tracking-wider">
            <span>Comanda #{order.orderNumber} • Bahía Blanca</span>
          </div>

          <h1 className="font-headline font-bold text-2xl text-on-surface">
            {order.status === 'PENDIENTE_PAGO' && 'Esperando Acreditación de Pago'}
            {order.status === 'PENDIENTE_VERIFICACION' && 'Comprobante en Verificación'}
            {order.status === 'CREADO' && '¡Comanda recibida con éxito!'}
            {order.status === 'EN_COCINA' && 'Itamae elaborando tus piezas'}
            {order.status === 'LISTO' && (order.deliveryType === 'TAKE_AWAY' ? '¡Tu pedido está listo para retirar en Alsina 350!' : '¡Pedido listo, asignando cadete!')}
            {order.status === 'EN_CAMINO' && '¡Tu pedido va en camino por Bahía Blanca!'}
            {order.status === 'ENTREGADO' && '¡Pedido Entregado!'}
            {order.status === 'CANCELADO' && 'Comanda Cancelada'}
          </h1>

          <p className="text-xs text-on-surface-variant">
            {order.deliveryType === 'DELIVERY'
              ? `Entrega estimada en Bahía Blanca: ${order.estimatedMinutes} minutos en ${order.deliveryAddress}`
              : 'Retiro en Local: Alsina 350, Centro, Bahía Blanca'}
          </p>

          {order.scheduledFor && (
            <p className="text-xs text-secondary font-headline font-bold">
              🕒 Pedido Programado para: {new Date(order.scheduledFor).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hs
            </p>
          )}

          {/* Quick WhatsApp assistance button */}
          <div className="pt-2">
            <a
              href={`https://wa.me/${whatsappPhone}?text=Hola%20Yankun%20Sushi%20Lab%20Bah%C3%ADa%20Blanca,%20consulta%20por%20mi%20pedido%20%23${order.orderNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-tertiary-container/30 text-tertiary font-headline font-semibold text-xs hover:bg-tertiary-container/50 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">chat</span>
              <span>Consultar al Itamae por WhatsApp</span>
            </a>
          </div>
        </section>

        {/* Visual Stepper */}
        {order.status !== 'CANCELADO' && (
          <section className="bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30 space-y-4">
            <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface-variant">
              Estado de Elaboración en Vivo
            </h3>

            <div className="space-y-4">
              {STATUS_STEPS.map((step, idx) => {
                const isPast = idx < currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                const isFuture = idx > currentStepIndex;

                return (
                  <div key={step.key} className="flex items-start gap-3 relative">
                    {/* Step Icon Indicator */}
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                        isPast
                          ? 'bg-tertiary text-white'
                          : isCurrent
                          ? 'bg-primary text-white shadow-md ring-4 ring-primary/20'
                          : 'bg-surface-container text-on-surface-variant/40'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {isPast ? 'check' : step.icon}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0 pt-1">
                      <div className="flex items-center justify-between">
                        <span
                          className={`font-headline text-xs font-bold ${
                            isCurrent
                              ? 'text-primary'
                              : isPast
                              ? 'text-on-surface'
                              : 'text-on-surface-variant/50'
                          }`}
                        >
                          {step.label}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary animate-pulse">
                            En curso
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-on-surface-variant/80 mt-0.5">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Resumen de Items */}
        <section className="bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30 space-y-3">
          <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface-variant">
            Detalle de Piezas
          </h3>

          <div className="divide-y divide-outline-variant/15 text-xs">
            {order.items?.map((item) => (
              <div key={item.id} className="py-2.5 first:pt-0 last:pb-0 flex items-start justify-between">
                <div>
                  <span className="font-headline font-bold text-on-surface">
                    {item.quantity}x {item.name}
                  </span>
                  {item.baseRice && (
                    <span className="text-[10px] text-tertiary block">🍚 {item.baseRice}</span>
                  )}
                </div>
                <span className="font-mono text-on-surface font-semibold">
                  ${(item.price * item.quantity).toLocaleString('es-AR')}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-outline-variant/30 space-y-1.5 text-xs">
            <div className="flex justify-between text-on-surface-variant">
              <span>Subtotal:</span>
              <span>${order.subtotal.toLocaleString('es-AR')}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-secondary font-semibold">
                <span>Descuento:</span>
                <span>-${order.discount.toLocaleString('es-AR')}</span>
              </div>
            )}
            <div className="flex justify-between text-on-surface-variant">
              <span>Flete de envío:</span>
              <span>{order.deliveryFee === 0 ? 'Sin cargo' : `$${order.deliveryFee.toLocaleString('es-AR')}`}</span>
            </div>
            <div className="flex justify-between text-sm font-headline font-extrabold text-on-surface pt-1 border-t border-outline-variant/20">
              <span>Total Abonado:</span>
              <span className="text-primary text-base">${order.total.toLocaleString('es-AR')}</span>
            </div>
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
