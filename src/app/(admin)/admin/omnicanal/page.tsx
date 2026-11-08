'use client';

import React, { useState, useEffect } from 'react';

interface ChatConversation {
  id: string;
  customerName: string;
  customerPhone: string;
  channel: 'WHATSAPP' | 'INSTAGRAM';
  lastMessage: string;
  time: string;
  unread: number;
  messages: Array<{
    id: string;
    sender: 'CUSTOMER' | 'AGENT' | 'BOT';
    text: string;
    time: string;
  }>;
}

const INITIAL_CONVERSATIONS: ChatConversation[] = [
  {
    id: 'conv_1',
    customerName: 'Santiago Rossi',
    customerPhone: '+54 9 11 4444 7788',
    channel: 'WHATSAPP',
    lastMessage: 'Hola! Tienen nigiris aptos para celíacos sin TACC?',
    time: '19:42',
    unread: 1,
    messages: [
      { id: 'm1', sender: 'CUSTOMER', text: 'Buenas noches, quería consultar por la carta.', time: '19:40' },
      { id: 'm2', sender: 'CUSTOMER', text: 'Hola! Tienen nigiris aptos para celíacos sin TACC?', time: '19:42' },
    ],
  },
  {
    id: 'conv_2',
    customerName: 'Lucía Fernández',
    customerPhone: '@lucia.fernandez_sushi',
    channel: 'INSTAGRAM',
    lastMessage: 'Perfecto, ya hice el pago por transferencia!',
    time: '19:15',
    unread: 0,
    messages: [
      { id: 'm3', sender: 'CUSTOMER', text: 'Hola chicos, hasta qué hora toman pedidos hoy?', time: '18:55' },
      { id: 'm4', sender: 'BOT', text: '🕒 Horario de Servicio: Martes a Domingo de 19:30 a 23:45 hs.', time: '18:56' },
      { id: 'm5', sender: 'CUSTOMER', text: 'Perfecto, ya hice el pago por transferencia!', time: '19:15' },
    ],
  },
  {
    id: 'conv_3',
    customerName: 'Martín Benítez',
    customerPhone: '+54 9 11 8899 1122',
    channel: 'WHATSAPP',
    lastMessage: 'Llegan con delivery a Recoleta?',
    time: '18:30',
    unread: 0,
    messages: [
      { id: 'm6', sender: 'CUSTOMER', text: 'Buenas, llegan con delivery a Recoleta?', time: '18:30' },
      { id: 'm7', sender: 'BOT', text: '📍 Sí! Cubrimos Recoleta & Barrio Norte con costo de flete $1.500 (30-40 min).', time: '18:30' },
    ],
  },
];

export default function OmnicanalPage() {
  const [conversations, setConversations] = useState<ChatConversation[]>(INITIAL_CONVERSATIONS);
  const [selectedConv, setSelectedConv] = useState<ChatConversation>(INITIAL_CONVERSATIONS[0]);
  const [messageInput, setMessageInput] = useState('');
  const [orderDraft, setOrderDraft] = useState<Array<{ name: string; price: number; qty: number }>>([
    { name: 'Omakase Signature Roll (10 piezas)', price: 14500, qty: 1 },
    { name: 'Nigiri Salmón Trufado Akazu (6 piezas)', price: 12800, qty: 1 },
  ]);
  const [generatedLink, setGeneratedLink] = useState('');

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    const newMsg = {
      id: `m_${Date.now()}`,
      sender: 'AGENT' as const,
      text: messageInput.trim(),
      time: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
    };

    const updated = {
      ...selectedConv,
      messages: [...selectedConv.messages, newMsg],
      lastMessage: newMsg.text,
      time: newMsg.time,
    };

    setSelectedConv(updated);
    setConversations((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setMessageInput('');
  };

  const handleApplyMacro = (macroText: string) => {
    setMessageInput(macroText);
  };

  const handleGenerateOrderLink = () => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const link = `https://sushilab.vercel.app/pedido/${randomNum}`;
    setGeneratedLink(link);
    setMessageInput(
      `¡Listo! He generado tu comanda de autor. Puedes abonarla y seguirla en vivo desde este enlace: ${link}`
    );
  };

  const draftTotal = orderDraft.reduce((sum, item) => sum + item.price * item.qty, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-outline-variant/30">
        <div>
          <span className="font-headline text-xs uppercase tracking-wider text-secondary font-bold">
            Comunicaciones Unificadas
          </span>
          <h1 className="font-headline font-bold text-2xl text-on-surface mt-0.5">
            Bandeja Omnicanal (WhatsApp & Instagram)
          </h1>
          <p className="text-xs text-on-surface-variant">
            Atención al cliente en vivo, macros rápidas y generador de pedidos directo desde la conversación.
          </p>
        </div>
      </div>

      {/* Main 3-Section Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[650px] bg-surface-container-lowest rounded-2xl shadow-card border border-outline-variant/30 overflow-hidden">
        {/* 1. Conversations List (Left, 3 cols) */}
        <div className="lg:col-span-3 border-r border-outline-variant/20 flex flex-col h-full bg-surface-container-low/40">
          <div className="p-3 border-b border-outline-variant/20">
            <h3 className="font-headline font-bold text-xs text-on-surface uppercase tracking-wider">
              Conversaciones Activas
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-outline-variant/15">
            {conversations.map((conv) => {
              const active = selectedConv.id === conv.id;
              return (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConv(conv)}
                  className={`p-3 cursor-pointer transition-colors ${
                    active ? 'bg-surface-container-high' : 'hover:bg-surface-container'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-headline font-bold text-xs text-on-surface truncate">
                      {conv.customerName}
                    </span>
                    <span className="text-[10px] text-on-surface-variant">{conv.time}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <p className="text-on-surface-variant truncate max-w-[160px] text-[11px]">
                      {conv.lastMessage}
                    </p>
                    <span
                      className={`text-[9px] font-headline font-bold px-1.5 py-0.2 rounded-full ${
                        conv.channel === 'WHATSAPP'
                          ? 'bg-[#25D366]/20 text-[#128C7E]'
                          : 'bg-purple-100 text-purple-700'
                      }`}
                    >
                      {conv.channel === 'WHATSAPP' ? 'WA' : 'IG'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Active Chat Stream (Middle, 5 cols) */}
        <div className="lg:col-span-5 flex flex-col h-full border-r border-outline-variant/20">
          {/* Chat Header */}
          <div className="p-3 border-b border-outline-variant/20 flex items-center justify-between bg-surface-container-low">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center font-bold text-xs text-on-surface">
                {selectedConv.customerName.charAt(0)}
              </div>
              <div>
                <div className="font-headline font-bold text-xs text-on-surface">
                  {selectedConv.customerName}
                </div>
                <div className="text-[10px] text-on-surface-variant">
                  {selectedConv.customerPhone} ({selectedConv.channel})
                </div>
              </div>
            </div>

            <span className="w-2 h-2 rounded-full bg-tertiary" />
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-surface">
            {selectedConv.messages.map((m) => {
              const isMe = m.sender === 'AGENT';
              const isBot = m.sender === 'BOT';
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed shadow-sm ${
                      isMe
                        ? 'bg-primary text-white rounded-tr-none'
                        : isBot
                        ? 'bg-secondary-container text-on-secondary-container rounded-tl-none font-medium'
                        : 'bg-surface-container-high text-on-surface rounded-tl-none'
                    }`}
                  >
                    {isBot && (
                      <span className="block text-[9px] font-headline font-bold uppercase tracking-wider text-secondary mb-1">
                        🤖 Bot Shokunin
                      </span>
                    )}
                    {m.text}
                  </div>
                  <span className="text-[9px] text-on-surface-variant mt-0.5 px-1">
                    {m.time}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Quick Macros Bar */}
          <div className="px-3 py-1.5 bg-surface-container-low border-t border-outline-variant/20 flex gap-1.5 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() =>
                handleApplyMacro(
                  '⚠️ Atención Shokunin: Todos nuestros rolls pueden adaptarse celíaco-friendly con salsa de soja sin TACC en espacio sanitizado.'
                )
              }
              className="text-[10px] font-headline font-medium px-2.5 py-1 rounded-full bg-surface-container hover:bg-surface-container-high whitespace-nowrap"
            >
              /alergias
            </button>
            <button
              type="button"
              onClick={() =>
                handleApplyMacro(
                  '📍 Nuestras zonas de reparto directo cubren Palermo Soho, Recoleta y Belgrano. También puedes retirar en local con 15% OFF.'
                )
              }
              className="text-[10px] font-headline font-medium px-2.5 py-1 rounded-full bg-surface-container hover:bg-surface-container-high whitespace-nowrap"
            >
              /zonas
            </button>
            <button
              type="button"
              onClick={() =>
                handleApplyMacro(
                  '🕒 Horario de servicio: Martes a Domingo de 19:30 a 23:45 hs.'
                )
              }
              className="text-[10px] font-headline font-medium px-2.5 py-1 rounded-full bg-surface-container hover:bg-surface-container-high whitespace-nowrap"
            >
              /horarios
            </button>
          </div>

          {/* Message Input form */}
          <form onSubmit={handleSendMessage} className="p-2.5 bg-surface-container-low border-t border-outline-variant/20 flex gap-2">
            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Escribe una respuesta o usa una macro..."
              className="flex-1 px-3 py-2 text-xs rounded-xl bg-surface border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary"
            />
            <button
              type="submit"
              className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary-container active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
            </button>
          </form>
        </div>

        {/* 3. Live Order Builder from Chat (Right, 4 cols) */}
        <div className="lg:col-span-4 p-4 flex flex-col h-full bg-surface-container-low/30 overflow-y-auto space-y-4">
          <div>
            <span className="font-headline text-[10px] uppercase tracking-wider text-secondary font-bold">
              Asistente de Venta en Vivo
            </span>
            <h3 className="font-headline font-bold text-sm text-on-surface">
              Creador de Pedido desde Chat
            </h3>
            <p className="text-[11px] text-on-surface-variant">
              Arma el pedido para {selectedConv.customerName} y genera un link de pago directo.
            </p>
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-3 border border-outline-variant/30 space-y-2">
            <div className="font-headline font-bold text-xs text-on-surface">
              Piezas en Borrador:
            </div>
            {orderDraft.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-xs py-1 border-b border-outline-variant/10">
                <span className="text-on-surface font-medium truncate pr-2">
                  {item.qty}x {item.name}
                </span>
                <span className="font-headline font-bold text-on-surface flex-shrink-0">
                  ${(item.price * item.qty).toLocaleString('es-AR')}
                </span>
              </div>
            ))}

            <div className="pt-2 flex justify-between font-headline font-bold text-xs text-primary">
              <span>Total Comanda:</span>
              <span>${draftTotal.toLocaleString('es-AR')}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGenerateOrderLink}
            className="w-full py-2.5 rounded-full bg-secondary hover:bg-secondary/90 text-white font-headline font-bold text-xs shadow-sm transition-all active:scale-95 flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">link</span>
            <span>Generar y Pegar Link en Chat</span>
          </button>

          {generatedLink && (
            <div className="p-2.5 rounded-xl bg-tertiary-container/20 border border-tertiary/40 text-[11px] space-y-1">
              <span className="font-headline font-bold text-tertiary block">
                ✓ Link de Comanda Generado:
              </span>
              <p className="text-on-surface break-all font-mono text-[10px] bg-surface p-1.5 rounded">
                {generatedLink}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
