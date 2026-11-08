'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { generateKitchenTicketText } from '@/lib/printer';

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
  total: number;
  status: 'CREADO' | 'EN_COCINA' | 'EN_CAMINO' | 'ENTREGADO' | 'CANCELADO';
  paymentMethod: string;
  paymentStatus: string;
  notes?: string;
  estimatedMinutes: number;
  createdAt: string;
  items?: OrderItem[];
}

export default function KitchenKdsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'DELIVERY' | 'TAKE_AWAY'>('ALL');
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error('Error fetching orders for KDS:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();

    // Subscribe to Supabase Realtime channel for instant order pushes
    const channel = supabase
      .channel('kds-orders-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Order' },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    const interval = setInterval(fetchOrders, 6000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [fetchOrders]);

  // Update order status
  const handleUpdateStatus = async (orderId: string, nextStatus: Order['status']) => {
    try {
      // Optimistic update
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
      );

      await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
    } catch (err) {
      console.error('Error updating order status:', err);
      fetchOrders();
    }
  };

  // Calculate elapsed minutes since order creation
  const getElapsedMinutes = (createdAt: string) => {
    const elapsed = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
    return Math.max(0, elapsed);
  };

  // Timer alert styling
  const getTimerBadge = (createdAt: string) => {
    const mins = getElapsedMinutes(createdAt);
    if (mins < 15) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-tertiary-container/30 text-tertiary font-headline text-[10px] font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
          <span>{mins}m (A tiempo)</span>
        </span>
      );
    }
    if (mins <= 30) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-headline text-[10px] font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
          <span>{mins}m (Atención)</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-error-container text-on-error-container font-headline text-[10px] font-bold animate-pulse">
        <span className="w-1.5 h-1.5 rounded-full bg-error" />
        <span>{mins}m (Demorado)</span>
      </span>
    );
  };

  // Trigger print thermal comanda
  const handlePrint = (order: Order) => {
    setPrintingOrder(order);
    const printWindow = window.open('', '_blank', 'width=350,height=600');
    if (!printWindow) return;

    const receiptHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Comanda #${order.orderNumber}</title>
          <style>
            body { font-family: monospace; font-size: 13px; margin: 0; padding: 10px; line-height: 1.3; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .title { font-size: 18px; font-weight: bold; }
            hr { border: none; border-top: 1px dashed #000; margin: 8px 0; }
            .item { display: flex; justify-content: space-between; margin-bottom: 4px; }
            .options { font-size: 11px; margin-left: 12px; color: #444; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="center">
            <div class="title">YANKUN SUSHI LAB</div>
            <div>*** COMANDA #${order.orderNumber} ***</div>
            <div class="bold">${order.deliveryType === 'TAKE_AWAY' ? '>> RETIRO EN LOCAL (TAKE AWAY) <<' : '>> ENVIO A DOMICILIO <<'}</div>
            <div>${new Date(order.createdAt).toLocaleTimeString('es-AR')}</div>
          </div>
          <hr />
          <div><strong>Cliente:</strong> ${order.customerName}</div>
          <div><strong>Tel:</strong> ${order.customerPhone}</div>
          ${order.deliveryAddress ? `<div><strong>Dirección:</strong> ${order.deliveryAddress}</div>` : ''}
          ${order.notes ? `<div><strong>OBS:</strong> ${order.notes}</div>` : ''}
          <hr />
          <div class="bold">CANT  PRODUCTO</div>
          <hr />
          ${order.items
            ?.map(
              (i) => `
            <div class="item">
              <span><strong>${i.quantity}x</strong> ${i.name}</span>
              <span>$${(i.price * i.quantity).toLocaleString('es-AR')}</span>
            </div>
            ${i.baseRice ? `<div class="options">• Base: ${i.baseRice}</div>` : ''}
            ${i.notes ? `<div class="options">• Nota: ${i.notes}</div>` : ''}
          `
            )
            .join('')}
          <hr />
          <div><strong>Pago:</strong> ${order.paymentMethod} (${order.paymentStatus})</div>
          <div class="bold" style="font-size: 15px; margin-top: 4px;">TOTAL: $${order.total.toLocaleString('es-AR')}</div>
          <hr />
          <div class="center" style="font-size: 11px;">Itamae: Yankun Shokunin Lab</div>
        </body>
      </html>
    `;

    printWindow.document.write(receiptHtml);
    printWindow.document.close();
  };

  const filteredOrders = orders.filter((o) => {
    if (activeFilter === 'ALL') return true;
    return o.deliveryType === activeFilter;
  });

  const createdOrders = filteredOrders.filter((o) => o.status === 'CREADO');
  const inKitchenOrders = filteredOrders.filter((o) => o.status === 'EN_COCINA');
  const readyOrders = filteredOrders.filter((o) => o.status === 'EN_CAMINO');

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-outline-variant/30">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-tertiary animate-ping" />
            <span className="font-headline text-xs uppercase tracking-wider text-primary font-bold">
              KDS en Tiempo Real
            </span>
          </div>
          <h1 className="font-headline font-bold text-2xl text-on-surface mt-1">
            Pantalla de Cocina & Comandas
          </h1>
          <p className="text-xs text-on-surface-variant">
            Sincronización instantánea con comensales vía Supabase Realtime & ESC/POS térmico.
          </p>
        </div>

        {/* Filter Pills & Manual Refresh */}
        <div className="flex items-center gap-2">
          <div className="flex p-1 bg-surface-container rounded-xl text-xs font-headline font-semibold">
            {[
              { id: 'ALL', label: 'Todos' },
              { id: 'DELIVERY', label: 'Delivery' },
              { id: 'TAKE_AWAY', label: 'Take Away' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeFilter === f.id
                    ? 'bg-primary text-white shadow-sm font-bold'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <button
            onClick={fetchOrders}
            className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center text-on-surface hover:bg-surface-container-high transition-colors"
            title="Sincronizar ahora"
          >
            <span className="material-symbols-outlined text-[18px]">sync</span>
          </button>
        </div>
      </div>

      {/* 3-Column Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Column 1: Creados */}
        <div className="bg-surface-container-low rounded-2xl p-4 border border-outline-variant/30 flex flex-col min-h-[500px]">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-outline-variant/30">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-primary" />
              <h3 className="font-headline font-bold text-sm text-on-surface">
                Comandas Nuevas
              </h3>
            </div>
            <span className="w-6 h-6 rounded-full bg-primary text-white font-headline font-bold text-xs flex items-center justify-center">
              {createdOrders.length}
            </span>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto">
            {createdOrders.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-xs text-on-surface-variant italic">
                Sin comandas nuevas en espera
              </div>
            ) : (
              createdOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-surface-container-lowest rounded-xl p-3.5 shadow-card border-l-4 border-l-primary space-y-2.5 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-headline font-extrabold text-sm text-on-surface">
                      #{order.orderNumber}
                    </span>
                    {getTimerBadge(order.createdAt)}
                  </div>

                  <div>
                    <div className="font-headline font-semibold text-xs text-on-surface">
                      {order.customerName}
                    </div>
                    <div className="text-[11px] text-on-surface-variant">
                      {order.deliveryType === 'TAKE_AWAY' ? '📍 Retiro en Local' : `🛵 ${order.deliveryAddress}`}
                    </div>
                  </div>

                  {/* Items list */}
                  <div className="bg-surface-container/60 rounded-lg p-2 space-y-1 text-xs">
                    {order.items?.map((item) => (
                      <div key={item.id} className="leading-tight">
                        <span className="font-bold text-primary">{item.quantity}x</span>{' '}
                        <span className="font-medium text-on-surface">{item.name}</span>
                        {item.baseRice && (
                          <span className="block text-[10px] text-secondary">
                            ✦ {item.baseRice}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {order.notes && (
                    <p className="text-[10px] bg-secondary-container/30 text-on-secondary-container p-1.5 rounded font-medium">
                      Nota: {order.notes}
                    </p>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handlePrint(order)}
                      className="px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-headline flex items-center gap-1"
                      title="Imprimir ticket térmico"
                    >
                      <span className="material-symbols-outlined text-[15px]">print</span>
                      <span>Ticket</span>
                    </button>

                    <button
                      onClick={() => handleUpdateStatus(order.id, 'EN_COCINA')}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-primary hover:bg-primary-container text-white font-headline font-bold text-xs shadow-sm flex items-center justify-center gap-1 active:scale-95 transition-all"
                    >
                      <span>Aceptar a Cocina</span>
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 2: En Cocina */}
        <div className="bg-surface-container-low rounded-2xl p-4 border border-outline-variant/30 flex flex-col min-h-[500px]">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-outline-variant/30">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-secondary" />
              <h3 className="font-headline font-bold text-sm text-on-surface">
                En Barra Shokunin
              </h3>
            </div>
            <span className="w-6 h-6 rounded-full bg-secondary text-white font-headline font-bold text-xs flex items-center justify-center">
              {inKitchenOrders.length}
            </span>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto">
            {inKitchenOrders.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-xs text-on-surface-variant italic">
                La barra está al día
              </div>
            ) : (
              inKitchenOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-surface-container-lowest rounded-xl p-3.5 shadow-card border-l-4 border-l-secondary space-y-2.5 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-headline font-extrabold text-sm text-on-surface">
                      #{order.orderNumber}
                    </span>
                    {getTimerBadge(order.createdAt)}
                  </div>

                  <div>
                    <div className="font-headline font-semibold text-xs text-on-surface">
                      {order.customerName}
                    </div>
                    <div className="text-[11px] text-on-surface-variant">
                      {order.deliveryType === 'TAKE_AWAY' ? '📍 Retiro en Local' : `🛵 ${order.deliveryAddress}`}
                    </div>
                  </div>

                  <div className="bg-surface-container/60 rounded-lg p-2 space-y-1 text-xs">
                    {order.items?.map((item) => (
                      <div key={item.id} className="leading-tight">
                        <span className="font-bold text-secondary">{item.quantity}x</span>{' '}
                        <span className="font-medium text-on-surface">{item.name}</span>
                        {item.baseRice && (
                          <span className="block text-[10px] text-secondary">
                            ✦ {item.baseRice}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {order.notes && (
                    <p className="text-[10px] bg-secondary-container/30 text-on-secondary-container p-1.5 rounded font-medium">
                      Nota: {order.notes}
                    </p>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handlePrint(order)}
                      className="px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-headline flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[15px]">print</span>
                    </button>

                    <button
                      onClick={() => handleUpdateStatus(order.id, 'EN_CAMINO')}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-secondary hover:bg-secondary/90 text-white font-headline font-bold text-xs shadow-sm flex items-center justify-center gap-1 active:scale-95 transition-all"
                    >
                      <span>Marcar Listo / Despacho</span>
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 3: Listos / En Camino */}
        <div className="bg-surface-container-low rounded-2xl p-4 border border-outline-variant/30 flex flex-col min-h-[500px]">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-outline-variant/30">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-tertiary" />
              <h3 className="font-headline font-bold text-sm text-on-surface">
                Listos / En Camino
              </h3>
            </div>
            <span className="w-6 h-6 rounded-full bg-tertiary text-white font-headline font-bold text-xs flex items-center justify-center">
              {readyOrders.length}
            </span>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto">
            {readyOrders.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-xs text-on-surface-variant italic">
                Sin pedidos en despacho
              </div>
            ) : (
              readyOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-surface-container-lowest rounded-xl p-3.5 shadow-card border-l-4 border-l-tertiary space-y-2.5 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-headline font-extrabold text-sm text-on-surface">
                      #{order.orderNumber}
                    </span>
                    <span className="text-[10px] font-headline font-bold text-tertiary bg-tertiary-container/30 px-2 py-0.5 rounded-full">
                      {order.deliveryType === 'TAKE_AWAY' ? 'Listo en Barra' : 'Con Repartidor'}
                    </span>
                  </div>

                  <div>
                    <div className="font-headline font-semibold text-xs text-on-surface">
                      {order.customerName}
                    </div>
                    <div className="text-[11px] text-on-surface-variant">
                      Total: ${order.total.toLocaleString('es-AR')} ({order.paymentMethod})
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handlePrint(order)}
                      className="px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-headline flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[15px]">print</span>
                    </button>

                    <button
                      onClick={() => handleUpdateStatus(order.id, 'ENTREGADO')}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-tertiary hover:bg-tertiary/90 text-white font-headline font-bold text-xs shadow-sm flex items-center justify-center gap-1 active:scale-95 transition-all"
                    >
                      <span className="material-symbols-outlined text-[16px]">task_alt</span>
                      <span>Marcar Entregado</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
