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
  status: 'CREADO' | 'EN_COCINA' | 'EN_CAMINO' | 'ENTREGADO' | 'CANCELADO';
  paymentMethod: string;
  paymentStatus: string;
  estimatedMinutes: number;
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
  { key: 'CREADO', label: 'Comanda Recibida', desc: 'En cola de cocina', icon: 'receipt_long' },
  { key: 'EN_COCINA', label: 'En Preparación', desc: 'El Itamae elabora tus piezas', icon: 'skillet' },
  { key: 'EN_CAMINO', label: 'En Viaje / Listo', desc: 'Camino a tu domicilio o listo para retirar', icon: 'moped' },
  { key: 'ENTREGADO', label: 'Entregado', desc: '¡Que disfrutes la experiencia!', icon: 'task_alt' },
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

  // Fetch order data
  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
      }
    } catch (e) {
      console.error('Error fetching order:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();

    // Setup Supabase Realtime subscription
    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'Order',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          console.log('Realtime Order Update received:', payload);
          setOrder((prev) => (prev ? { ...prev, ...payload.new } : (payload.new as OrderData)));
        }
      )
      .subscribe();

    // Fallback polling every 8 seconds
    const interval = setInterval(fetchOrder, 8000);

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
          Localizando comanda en el laboratorio...
        </p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="bg-surface min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <Header />
        <span className="material-symbols-outlined text-4xl text-outline mb-2">error</span>
        <h2 className="font-headline font-bold text-lg text-on-surface">Pedido no encontrado</h2>
        <p className="text-xs text-on-surface-variant mt-1 max-w-xs">
          No pudimos localizar la comanda solicitada. Verifica el enlace o consulta por WhatsApp.
        </p>
        <Link
          href="/"
          className="mt-4 px-6 py-2.5 rounded-full bg-primary text-white font-headline font-bold text-xs"
        >
          Volver al Inicio
        </Link>
      </div>
    );
  }

  // Calculate active step index
  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.key === order.status);

  return (
    <div className="bg-surface min-h-screen pb-28">
      <Header />

      <main className="max-w-xl mx-auto pt-20 px-4 space-y-4">
        {/* Order Status Header */}
        <section className="bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30 text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container font-headline font-bold text-xs uppercase tracking-wider">
            <span>Comanda #{order.orderNumber}</span>
          </div>

          <h1 className="font-headline font-bold text-2xl text-on-surface">
            {order.status === 'CREADO' && '¡Comanda recibida con éxito!'}
            {order.status === 'EN_COCINA' && 'Itamae preparando tus piezas'}
            {order.status === 'EN_CAMINO' && (order.deliveryType === 'TAKE_AWAY' ? '¡Tu pedido está listo para retirar!' : '¡Tu pedido va en camino!')}
            {order.status === 'ENTREGADO' && '¡Pedido Entregado!'}
            {order.status === 'CANCELADO' && 'Pedido Cancelado'}
          </h1>

          <p className="text-xs text-on-surface-variant">
            {order.deliveryType === 'DELIVERY'
              ? `Entrega estimada: ${order.estimatedMinutes} minutos en ${order.deliveryAddress}`
              : 'Retiro en Local: Honduras 4850, Palermo Soho'}
          </p>

          {/* Quick WhatsApp assistance button */}
          <div className="pt-2">
            <a
              href={`https://wa.me/5491155556666?text=Hola%20Yankun%20Sushi%20Lab,%20consulta%20por%20mi%20pedido%20%23${order.orderNumber}`}
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
        <section className="bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30 space-y-4">
          <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface-variant">
            Estado de Preparación
          </h3>

          <div className="space-y-4">
            {STATUS_STEPS.map((step, idx) => {
              const isPast = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              const isFuture = idx > currentStepIndex;

              return (
                <div key={step.key} className="flex items-start gap-3 relative">
                  {/* Vertical connector line */}
                  {idx < STATUS_STEPS.length - 1 && (
                    <div
                      className={`absolute left-4 top-8 w-0.5 h-8 transition-colors ${
                        idx < currentStepIndex ? 'bg-primary' : 'bg-outline-variant/40'
                      }`}
                    />
                  )}

                  {/* Icon circle */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 transition-all ${
                      isPast
                        ? 'bg-primary text-white shadow-sm'
                        : isCurrent
                        ? 'bg-primary text-white ring-4 ring-primary/20 shadow-sm animate-pulse'
                        : 'bg-surface-container text-outline'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {isPast ? 'check' : step.icon}
                    </span>
                  </div>

                  {/* Content text */}
                  <div className="flex-1 min-w-0">
                    <div
                      className={`font-headline text-xs ${
                        isCurrent
                          ? 'font-bold text-primary text-sm'
                          : isPast
                          ? 'font-bold text-on-surface'
                          : 'font-medium text-on-surface-variant'
                      }`}
                    >
                      {step.label}
                    </div>
                    <div className="text-[11px] text-on-surface-variant">
                      {step.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Receipt Detail */}
        <section className="bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30 space-y-3">
          <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface-variant">
            Detalle del Pedido
          </h3>

          <div className="divide-y divide-outline-variant/20 text-xs">
            {order.items?.map((item) => (
              <div key={item.id} className="py-2.5 flex justify-between items-center">
                <div>
                  <div className="font-headline font-semibold text-on-surface">
                    {item.quantity}x {item.name}
                  </div>
                  {item.baseRice && (
                    <p className="text-[10px] text-secondary">✦ {item.baseRice}</p>
                  )}
                  {item.notes && (
                    <p className="text-[10px] text-primary italic">Nota: {item.notes}</p>
                  )}
                </div>
                <div className="font-headline font-bold text-on-surface">
                  ${(item.price * item.quantity).toLocaleString('es-AR')}
                </div>
              </div>
            ))}
          </div>

          <hr className="border-outline-variant/30 my-2" />

          {/* Breakdown */}
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-on-surface-variant">
              <span>Subtotal</span>
              <span>${order.subtotal.toLocaleString('es-AR')}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-tertiary font-medium">
                <span>Descuento</span>
                <span>-${order.discount.toLocaleString('es-AR')}</span>
              </div>
            )}
            {order.deliveryFee > 0 && (
              <div className="flex justify-between text-on-surface-variant">
                <span>Envío</span>
                <span>${order.deliveryFee.toLocaleString('es-AR')}</span>
              </div>
            )}
            <div className="flex justify-between font-headline font-bold text-sm text-primary pt-1 border-t border-outline-variant/20">
              <span>Total Abonado</span>
              <span>${order.total.toLocaleString('es-AR')}</span>
            </div>
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
