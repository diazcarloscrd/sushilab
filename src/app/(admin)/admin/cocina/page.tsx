'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { generateKitchenTicketText, generateDispatchTicketText } from '@/lib/printer';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  baseRice?: string;
  saucesJson?: string;
  extrasJson?: string;
  notes?: string;
}

interface Order {
  id: string;
  orderNumber: number;
  customerName: string;
  customerPhone: string;
  deliveryType: 'DELIVERY' | 'TAKE_AWAY';
  deliveryAddress: string;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  status: 'PENDIENTE_PAGO' | 'PENDIENTE_VERIFICACION' | 'CREADO' | 'EN_COCINA' | 'LISTO' | 'EN_CAMINO' | 'ENTREGADO' | 'CANCELADO';
  paymentMethod: string;
  paymentStatus: string;
  paymentProofUrl?: string;
  cashAmountPaid?: number;
  cashChange?: number;
  notes?: string;
  estimatedMinutes: number;
  createdAt: string;
  items?: OrderItem[];
}

export default function KitchenKdsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'DELIVERY' | 'TAKE_AWAY' | 'VERIFICACION'>('ALL');
  const [selectedProofOrder, setSelectedProofOrder] = useState<Order | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const previousOrdersCount = useRef<number>(0);

  // Reproductor de Chime de Cocina con Web Audio API (Sin depender de mp3 externo)
  const playKitchenChime = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.6);
    } catch (e) {
      console.warn('Audio no inicializado:', e);
    }
  }, [soundEnabled]);

  // Cargar pedidos activos de cocina
  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/orders?limit=40');
      if (res.ok) {
        const data = await res.json();
        const list: Order[] = data.orders || [];

        // Filtrar pedidos relevantes para cocina (En cocina, Listos para despacho y pendientes de comprobante)
        const kitchenOrders = list.filter((o) =>
          ['EN_COCINA', 'LISTO', 'PENDIENTE_VERIFICACION'].includes(o.status)
        );

        if (kitchenOrders.length > previousOrdersCount.current && previousOrdersCount.current > 0) {
          playKitchenChime();
        }
        previousOrdersCount.current = kitchenOrders.length;
        setOrders(kitchenOrders);
      }
    } catch (err) {
      console.error('Error fetching orders for KDS:', err);
    } finally {
      setLoading(false);
    }
  }, [playKitchenChime]);

  useEffect(() => {
    fetchOrders();

    // Suscripción Realtime a cambios en comandas
    const channel = supabase
      .channel('kds_realtime_orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Order' },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOrders]);

  // Actualizar estado de comanda
  const handleUpdateStatus = async (orderId: string, nextStatus: Order['status'], notes?: string) => {
    try {
      // Optimistic update
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
      );

      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus, notes }),
      });

      if (!res.ok) {
        fetchOrders();
      }
    } catch (err) {
      console.error('Error updating order status:', err);
      fetchOrders();
    }
  };

  // Aprobar comprobante de transferencia
  const handleApproveTransfer = async (orderId: string) => {
    try {
      await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'EN_COCINA',
          paymentStatus: 'APROBADO',
          notes: 'Transferencia bancaria verificada manualmente por cocina/caja',
        }),
      });
      setSelectedProofOrder(null);
      fetchOrders();
    } catch (err) {
      console.error('Error aprobando transferencia:', err);
    }
  };

  // Imprimir comanda de cocina o ticket de despacho
  const handlePrint = (order: Order, type: 'KITCHEN' | 'DISPATCH') => {
    const printData = {
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      address: order.deliveryAddress,
      isTakeAway: order.deliveryType === 'TAKE_AWAY',
      notes: order.notes,
      items: (order.items || []).map((i) => ({
        name: i.name,
        quantity: i.quantity,
        baseRice: i.baseRice,
        price: i.price,
      })),
      subtotal: order.subtotal,
      discount: order.discount,
      deliveryFee: order.deliveryFee,
      total: order.total,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      cashAmountPaid: order.cashAmountPaid,
      cashChange: order.cashChange,
      createdAt: order.createdAt,
    };

    const text = type === 'KITCHEN'
      ? generateKitchenTicketText(printData)
      : generateDispatchTicketText(printData);

    // Abrir ventana limpia para imprimir
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Comanda #${order.orderNumber}</title>
            <style>
              body { font-family: monospace; white-space: pre; font-size: 13px; margin: 10px; }
            </style>
          </head>
          <body>${text.replace(/\x1B[^\n]*/g, '').replace(/\x1D[^\n]*/g, '')}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  const getElapsedMinutes = (createdAt: string) => {
    const elapsed = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
    return Math.max(0, elapsed);
  };

  const getTimerBadge = (createdAt: string) => {
    const mins = getElapsedMinutes(createdAt);
    if (mins < 15) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-tertiary-container/40 text-tertiary font-headline text-[10px] font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
          <span>{mins}m (A tiempo)</span>
        </span>
      );
    }
    if (mins <= 30) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-headline text-[10px] font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
          <span>{mins}m (Atención)</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-error-container text-error font-headline text-[10px] font-bold animate-pulse">
        <span className="w-1.5 h-1.5 rounded-full bg-error" />
        <span>{mins}m (DEMORADO)</span>
      </span>
    );
  };

  const filteredOrders = orders.filter((o) => {
    if (activeFilter === 'DELIVERY') return o.deliveryType === 'DELIVERY';
    if (activeFilter === 'TAKE_AWAY') return o.deliveryType === 'TAKE_AWAY';
    if (activeFilter === 'VERIFICACION') return o.status === 'PENDIENTE_VERIFICACION';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-outline-variant/30">
        <div>
          <span className="font-headline text-xs uppercase tracking-wider text-secondary font-bold">
            Bahía Blanca • KDS Shokunin
          </span>
          <h1 className="font-headline font-bold text-2xl text-on-surface mt-0.5">
            Sistema de Despacho de Cocina en Vivo
          </h1>
          <p className="text-xs text-on-surface-variant">
            Monitoreo en tiempo real de piezas, tiempos de elaboración y control de comanda.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Sound Toggle */}
          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              playKitchenChime();
            }}
            className={`px-3 py-2 rounded-xl text-xs font-headline font-semibold flex items-center gap-1.5 transition-all ${
              soundEnabled
                ? 'bg-tertiary-container text-on-tertiary-container'
                : 'bg-surface-container text-on-surface-variant'
            }`}
            title="Activar/desactivar alerta sonora de nuevas comandas"
          >
            <span className="material-symbols-outlined text-[16px]">
              {soundEnabled ? 'volume_up' : 'volume_off'}
            </span>
            <span>{soundEnabled ? 'Alerta Sonora Activa' : 'Silenciado'}</span>
          </button>

          {/* Filters */}
          <div className="flex rounded-xl bg-surface-container p-1 border border-outline-variant/30 text-xs font-headline">
            <button
              onClick={() => setActiveFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeFilter === 'ALL'
                  ? 'bg-primary text-white font-bold shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Todos ({orders.length})
            </button>
            <button
              onClick={() => setActiveFilter('DELIVERY')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeFilter === 'DELIVERY'
                  ? 'bg-primary text-white font-bold shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Delivery
            </button>
            <button
              onClick={() => setActiveFilter('TAKE_AWAY')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeFilter === 'TAKE_AWAY'
                  ? 'bg-primary text-white font-bold shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Take Away
            </button>
            {orders.some((o) => o.status === 'PENDIENTE_VERIFICACION') && (
              <button
                onClick={() => setActiveFilter('VERIFICACION')}
                className={`px-3 py-1.5 rounded-lg transition-all bg-secondary-container text-on-secondary-container font-bold animate-pulse`}
              >
                ⚠️ Transferencias
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Orders Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-2xl p-12 text-center border border-outline-variant/30 space-y-3">
          <span className="material-symbols-outlined text-4xl text-outline">skillet</span>
          <h3 className="font-headline font-bold text-base text-on-surface">
            Cocina al Día
          </h3>
          <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
            No hay comandas activas pendientes de elaboración en este momento. Las nuevas órdenes confirmadas ingresarán automáticamente con alerta sonora.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredOrders.map((order) => {
            const isVerification = order.status === 'PENDIENTE_VERIFICACION';
            const isReady = order.status === 'LISTO';
            return (
              <div
                key={order.id}
                className={`bg-surface-container-lowest rounded-2xl border transition-all shadow-card flex flex-col overflow-hidden ${
                  isVerification
                    ? 'border-secondary/60 ring-1 ring-secondary/40'
                    : isReady
                    ? 'border-tertiary/60'
                    : 'border-outline-variant/30'
                }`}
              >
                {/* Header card */}
                <div className="p-4 bg-surface-container-low/50 border-b border-outline-variant/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-headline font-bold text-lg text-on-surface">
                      #{order.orderNumber}
                    </span>
                    <span
                      className={`text-[10px] font-headline font-bold px-2 py-0.5 rounded-full ${
                        order.deliveryType === 'TAKE_AWAY'
                          ? 'bg-secondary-container text-on-secondary-container'
                          : 'bg-primary-container text-on-primary-container'
                      }`}
                    >
                      {order.deliveryType === 'TAKE_AWAY' ? 'Retiro Local' : 'Delivery'}
                    </span>
                  </div>
                  {getTimerBadge(order.createdAt)}
                </div>

                {/* Body info */}
                <div className="p-4 flex-1 space-y-3">
                  {/* Customer info */}
                  <div className="text-xs">
                    <span className="font-headline font-bold text-on-surface block">
                      {order.customerName}
                    </span>
                    <span className="text-on-surface-variant text-[11px] block">
                      {order.customerPhone} • {order.deliveryAddress}
                    </span>
                  </div>

                  {/* Notes / Allergies alert */}
                  {order.notes && (
                    <div className="p-2.5 rounded-xl bg-error-container/20 border border-error/30 text-error text-[11px] font-semibold flex items-start gap-1.5">
                      <span className="material-symbols-outlined text-[15px] flex-shrink-0 mt-0.5">warning</span>
                      <span>{order.notes}</span>
                    </div>
                  )}

                  {/* Items */}
                  <div className="space-y-2 border-t border-b border-outline-variant/20 py-3">
                    {order.items?.map((item) => (
                      <div key={item.id} className="text-xs flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-headline font-bold text-on-surface">
                            {item.quantity}x {item.name}
                          </span>
                          {item.baseRice && (
                            <span className="block text-[10px] text-tertiary font-medium">
                              🍚 {item.baseRice}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-mono text-on-surface-variant flex-shrink-0">
                          ${(item.price * item.quantity).toLocaleString('es-AR')}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Payment Details */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-on-surface-variant">
                      Pago: <strong className="text-on-surface">{order.paymentMethod}</strong> ({order.paymentStatus})
                    </span>
                    <span className="font-headline font-bold text-sm text-primary">
                      ${order.total.toLocaleString('es-AR')}
                    </span>
                  </div>

                  {order.paymentMethod === 'EFECTIVO' && order.cashAmountPaid && (
                    <div className="text-[11px] bg-surface-container px-2.5 py-1.5 rounded-lg text-on-surface">
                      Paga con: <strong>${order.cashAmountPaid.toLocaleString('es-AR')}</strong> | Vuelto: <strong className="text-primary">${(order.cashChange || 0).toLocaleString('es-AR')}</strong>
                    </div>
                  )}

                  {/* Verification banner if bank transfer proof attached */}
                  {isVerification && (
                    <div className="p-3 rounded-xl bg-secondary-container/30 border border-secondary/40 space-y-2">
                      <div className="flex items-center justify-between text-xs text-on-secondary-container font-headline font-bold">
                        <span>Comprobante de Transferencia</span>
                        <button
                          onClick={() => setSelectedProofOrder(order)}
                          className="text-[11px] underline text-primary"
                        >
                          Ver Imagen
                        </button>
                      </div>
                      <button
                        onClick={() => handleApproveTransfer(order.id)}
                        className="w-full py-2 rounded-lg bg-secondary text-white font-headline text-xs font-bold hover:bg-secondary/90 transition-all shadow-sm"
                      >
                        ✓ Aprobar Pago y Pasar a Cocina
                      </button>
                    </div>
                  )}
                </div>

                {/* Actions bottom bar */}
                <div className="p-3 bg-surface-container-low border-t border-outline-variant/20 flex gap-2">
                  <button
                    onClick={() => handlePrint(order, 'KITCHEN')}
                    className="p-2.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface transition-all"
                    title="Imprimir comanda de cocina (ESC/POS)"
                  >
                    <span className="material-symbols-outlined text-[18px]">print</span>
                  </button>

                  <button
                    onClick={() => handlePrint(order, 'DISPATCH')}
                    className="p-2.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface transition-all"
                    title="Imprimir ticket de despacho para cadetería"
                  >
                    <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                  </button>

                  {order.status === 'EN_COCINA' && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'LISTO')}
                      className="flex-1 py-2.5 rounded-xl bg-primary text-white font-headline text-xs font-bold hover:bg-primary/90 transition-all shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px]">check</span>
                      <span>Marcar Listo</span>
                    </button>
                  )}

                  {order.status === 'LISTO' && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'EN_CAMINO')}
                      className="flex-1 py-2.5 rounded-xl bg-tertiary text-white font-headline text-xs font-bold hover:bg-tertiary/90 transition-all shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px]">moped</span>
                      <span>Despachar Reparto</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal para Ver Comprobante de Transferencia */}
      {selectedProofOrder && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-headline font-bold text-base text-on-surface">
                Comprobante • Pedido #{selectedProofOrder.orderNumber}
              </h3>
              <button
                onClick={() => setSelectedProofOrder(null)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface"
              >
                ✕
              </button>
            </div>

            <div className="aspect-[4/3] bg-black/10 rounded-xl overflow-hidden flex items-center justify-center border border-outline-variant/30">
              {selectedProofOrder.paymentProofUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedProofOrder.paymentProofUrl}
                  alt="Comprobante de transferencia"
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-xs text-on-surface-variant">Sin imagen adjunta</span>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedProofOrder(null)}
                className="px-4 py-2 rounded-xl text-xs font-headline font-semibold text-on-surface-variant hover:bg-surface-container"
              >
                Cerrar
              </button>
              <button
                onClick={() => handleApproveTransfer(selectedProofOrder.id)}
                className="px-5 py-2 rounded-xl bg-primary text-white text-xs font-headline font-bold hover:bg-primary/90 shadow-sm"
              >
                Aprobar y Mandar a Cocina
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
