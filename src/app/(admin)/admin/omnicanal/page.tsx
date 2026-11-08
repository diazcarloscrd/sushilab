'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface ConversationItem {
  id: string;
  customerPhone: string;
  customerName?: string | null;
  channel: string;
  botActive: boolean;
  unreadCount: number;
  lastMessageText?: string | null;
  lastMessageAt: string;
}

interface MessageItem {
  id: string;
  customerPhone: string;
  channel: string;
  senderType: 'CUSTOMER' | 'AGENT' | 'BOT';
  text: string;
  createdAt: string;
}

export default function AdminOmnicanalPage() {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [filterChannel, setFilterChannel] = useState<'ALL' | 'WHATSAPP' | 'INSTAGRAM'>('ALL');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Cargar lista de conversaciones
  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/conversations');
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
        if (!selectedPhone && data.length > 0) {
          setSelectedPhone(data[0].customerPhone);
        }
      }
    } catch (e) {
      console.error('Error cargando conversaciones:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedPhone]);

  // Cargar mensajes de la conversación seleccionada
  const loadMessages = useCallback(async (phone: string) => {
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/admin/conversations/${encodeURIComponent(phone)}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
        // Marcar como leída
        await fetch('/api/admin/conversations', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customerPhone: phone, markRead: true }),
        });
        setConversations((prev) =>
          prev.map((c) => (c.customerPhone === phone ? { ...c, unreadCount: 0 } : c))
        );
      }
    } catch (e) {
      console.error('Error cargando mensajes:', e);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();

    // Supabase Realtime para nuevos mensajes
    const channel = supabase
      .channel('omnicanal_chat_updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ChatMessage' }, (payload) => {
        const newMsg = payload.new as MessageItem;
        if (selectedPhone && newMsg.customerPhone === selectedPhone) {
          setMessages((prev) => [...prev, newMsg]);
        }
        loadConversations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadConversations, selectedPhone]);

  useEffect(() => {
    if (selectedPhone) {
      loadMessages(selectedPhone);
    }
  }, [selectedPhone, loadMessages]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const activeConv = conversations.find((c) => c.customerPhone === selectedPhone);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedPhone || sending) return;

    const messageText = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      const res = await fetch(`/api/admin/conversations/${encodeURIComponent(selectedPhone)}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: messageText, channel: activeConv?.channel || 'WHATSAPP' }),
      });

      if (res.ok) {
        const createdMsg = await res.json();
        setMessages((prev) => [...prev, createdMsg]);
        loadConversations();
      }
    } catch (e) {
      console.error('Error enviando mensaje:', e);
    } finally {
      setSending(false);
    }
  };

  const handleToggleBot = async () => {
    if (!activeConv) return;
    const nextState = !activeConv.botActive;

    try {
      setConversations((prev) =>
        prev.map((c) => (c.id === activeConv.id ? { ...c, botActive: nextState } : c))
      );

      await fetch('/api/admin/conversations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerPhone: activeConv.customerPhone, botActive: nextState }),
      });
    } catch (e) {
      console.error('Error alternando bot:', e);
    }
  };

  // Simular mensaje entrante para pruebas sin Meta
  const handleSimulateIncoming = async () => {
    const testPhone = '+5492914445566';
    const sampleTexts = [
      '¡Hola! ¿Llegan con delivery a Palihue?',
      '¿Tienen rolls aptos para celíacos sin TACC?',
      'Buenas tardes, ¿cuál es la recomendación del chef para hoy?',
    ];
    const randomText = sampleTexts[Math.floor(Math.random() * sampleTexts.length)];

    await fetch('/api/webhooks/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entry: [
          {
            changes: [
              {
                value: {
                  messages: [
                    {
                      id: `wamid_sim_${Date.now()}`,
                      from: testPhone,
                      text: { body: randomText },
                    },
                  ],
                  contacts: [{ profile: { name: 'Comensal Bahía Blanca' } }],
                },
              },
            ],
          },
        ],
      }),
    });

    loadConversations();
    setSelectedPhone(testPhone);
  };

  const filteredConversations = conversations.filter((c) => {
    if (filterChannel === 'ALL') return true;
    return c.channel === filterChannel;
  });

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant/30 flex-shrink-0">
        <div>
          <span className="font-headline text-xs uppercase tracking-wider text-secondary font-bold">
            Bahía Blanca • Atención Omnicanal
          </span>
          <h1 className="font-headline font-bold text-xl text-on-surface mt-0.5">
            Bandeja Unificada WhatsApp & Chat
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSimulateIncoming}
            className="px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-headline font-semibold flex items-center gap-1.5 transition-all shadow-sm"
            title="Genera un mensaje simulado de WhatsApp para testear"
          >
            <span className="material-symbols-outlined text-[16px] text-tertiary">science</span>
            <span>Simular Mensaje Entrante</span>
          </button>
        </div>
      </div>

      {/* Main Chat Splitter */}
      <div className="flex-1 min-h-0 bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-card flex overflow-hidden">
        {/* Left Sidebar: Conversations List */}
        <div className="w-80 border-r border-outline-variant/20 flex flex-col bg-surface-container-low/40">
          {/* Channels Filter */}
          <div className="p-3 border-b border-outline-variant/20 flex gap-1.5">
            {(['ALL', 'WHATSAPP', 'INSTAGRAM'] as const).map((ch) => (
              <button
                key={ch}
                onClick={() => setFilterChannel(ch)}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-headline font-bold transition-all ${
                  filterChannel === ch
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                {ch === 'ALL' ? 'Todos' : ch === 'WHATSAPP' ? 'WhatsApp' : 'Instagram'}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-outline-variant/10">
            {loading ? (
              <div className="p-8 text-center text-xs text-on-surface-variant">Cargando chats...</div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-on-surface-variant space-y-2">
                <span className="material-symbols-outlined text-3xl text-outline">forum</span>
                <p>No hay conversaciones activas.</p>
                <p className="text-[10px]">Usa &quot;Simular Mensaje Entrante&quot; para probar la bandeja.</p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = conv.customerPhone === selectedPhone;
                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedPhone(conv.customerPhone)}
                    className={`w-full p-3.5 text-left flex items-start gap-3 transition-colors ${
                      isSelected
                        ? 'bg-surface-container-highest/60 border-l-4 border-primary'
                        : 'hover:bg-surface-container'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center font-bold text-xs text-on-surface flex-shrink-0">
                      {conv.channel === 'WHATSAPP' ? '💬' : '📸'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-headline font-bold text-xs text-on-surface truncate">
                          {conv.customerName || conv.customerPhone}
                        </span>
                        <span className="text-[10px] text-on-surface-variant flex-shrink-0">
                          {new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <p className="text-xs text-on-surface-variant truncate mt-0.5">
                        {conv.lastMessageText || 'Sin mensajes'}
                      </p>

                      <div className="flex items-center gap-2 mt-1.5">
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                            conv.botActive
                              ? 'bg-tertiary-container/40 text-tertiary'
                              : 'bg-secondary-container text-on-secondary-container'
                          }`}
                        >
                          {conv.botActive ? '🤖 Bot Activo' : '👤 Humano'}
                        </span>

                        {conv.unreadCount > 0 && (
                          <span className="w-4 h-4 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center ml-auto">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Area: Messages View & Sender */}
        {activeConv ? (
          <div className="flex-1 flex flex-col min-w-0 bg-surface">
            {/* Top Chat Bar */}
            <div className="px-5 py-3 border-b border-outline-variant/20 flex items-center justify-between gap-3 bg-surface-container-lowest">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-sm text-primary">
                  {activeConv.customerName ? activeConv.customerName.charAt(0) : 'C'}
                </div>
                <div>
                  <h3 className="font-headline font-bold text-sm text-on-surface truncate">
                    {activeConv.customerName || 'Cliente'}
                  </h3>
                  <span className="text-xs text-on-surface-variant font-mono">
                    {activeConv.customerPhone}
                  </span>
                </div>
              </div>

              {/* Bot Toggle Switch */}
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-xs font-headline font-bold block">
                    {activeConv.botActive ? 'Bot IA Shokunin' : 'Atención Manual'}
                  </span>
                  <span className="text-[10px] text-on-surface-variant block">
                    {activeConv.botActive ? 'Responde automáticamente' : 'Operador humano en control'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleToggleBot}
                  className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${
                    activeConv.botActive ? 'bg-tertiary' : 'bg-outline-variant'
                  }`}
                  title="Activa o pausa el Bot IA para este cliente"
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      activeConv.botActive ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Messages Thread */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-xs text-on-surface-variant py-8">
                  Comienza a escribir para iniciar la conversación.
                </div>
              ) : (
                messages.map((m) => {
                  const isCustomer = m.senderType === 'CUSTOMER';
                  const isBot = m.senderType === 'BOT';
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isCustomer ? 'items-start' : 'items-end'}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-xs shadow-sm ${
                          isCustomer
                            ? 'bg-surface-container-high text-on-surface rounded-tl-sm'
                            : isBot
                            ? 'bg-tertiary-container/30 text-on-surface border border-tertiary/20 rounded-tr-sm'
                            : 'bg-primary text-white rounded-tr-sm'
                        }`}
                      >
                        {!isCustomer && (
                          <span className="text-[9px] font-bold block opacity-75 mb-0.5">
                            {isBot ? '🤖 Bot Shokunin' : '👤 Asesor Yankun'}
                          </span>
                        )}
                        <p className="whitespace-pre-line leading-relaxed">{m.text}</p>
                        <span className="text-[9px] opacity-60 block text-right mt-1">
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-outline-variant/20 bg-surface-container-lowest flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Escribe una respuesta para enviar por WhatsApp..."
                className="flex-1 px-4 py-2.5 text-xs rounded-xl bg-surface-container border border-outline-variant/40 text-on-surface focus:outline-none focus:border-primary"
              />
              <button
                type="submit"
                disabled={sending || !inputText.trim()}
                className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-headline font-bold flex items-center gap-1.5 hover:bg-primary/90 active:scale-95 disabled:opacity-50 transition-all shadow-sm"
              >
                <span>Enviar</span>
                <span className="material-symbols-outlined text-[16px]">send</span>
              </button>
            </form>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-on-surface-variant">
            <span className="material-symbols-outlined text-4xl mb-2 text-outline">chat</span>
            <p className="text-sm font-headline font-bold">Selecciona una conversación</p>
            <p className="text-xs mt-1">O simula un mensaje entrante para probar el sistema en vivo.</p>
          </div>
        )}
      </div>
    </div>
  );
}
