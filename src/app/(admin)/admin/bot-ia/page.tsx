'use client';

import React, { useState } from 'react';

interface BotRuleItem {
  id: string;
  trigger: string;
  response: string;
  escalate: boolean;
  active: boolean;
}

export default function BotIaConfigPage() {
  const [botActive, setBotActive] = useState(true);
  const [personality, setPersonality] = useState('shokunin_sommelier');
  const [promptInstructions, setPromptInstructions] = useState(
    `Eres el Sommelier y Asesor Gastronómico de Yankun Sushi Lab — Bahía Blanca.
Tu propósito es asesorar al comensal sobre el menú Shokunin, los matices del arroz fermentado en vinagre rojo Akazu, maridajes de salsas de autor y recomendaciones Omakase.
Mantén siempre un tono refinado, cálido y conciso.
REGLA CRÍTICA DE SEGURIDAD: Si el cliente reporta alergias (mariscos, celiaquía estricta, frutos secos) o solicita hablar con un asesor humano, activa inmediatamente la derivación a un operador del local en Bahía Blanca.`
  );

  const [rules, setRules] = useState<BotRuleItem[]>([
    {
      id: 'r1',
      trigger: '/alergias',
      response:
        '⚠️ Alerta Celíacos y Alérgenos: Nuestros rolls se preparan con estricta sanitización y opciones sin TACC con salsa de soja especial. Si tienes alergias severas a mariscos o frutos secos, te derivamos de inmediato con el Itamae.',
      escalate: true,
      active: true,
    },
    {
      id: 'r2',
      trigger: '/zonas',
      response:
        '📍 Zonas de entrega en Bahía Blanca: Centro ($1.200), Barrio Universitario ($1.500), Palihue ($1.800), Patagonia ($2.200) y Bella Vista ($1.600). Retiro en Local por Alsina 350 con 15% OFF.',
      escalate: false,
      active: true,
    },
    {
      id: 'r3',
      trigger: '/horarios',
      response: '🕒 Martes a Domingo de 19:30 a 23:45 hs. Pedidos en vivo o programados en nuestra Web App.',
      escalate: false,
      active: true,
    },
  ]);

  // Test Simulator state
  const [testMessages, setTestMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string }>>([
    {
      sender: 'bot',
      text: 'Konbanwa (Buenas noches). Soy el Asesor Virtual de Yankun Sushi Lab Bahía Blanca 鮨. ¿En qué puedo guiarte hoy respecto a nuestra carta de autor?',
    },
  ]);
  const [testInput, setTestInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleTestSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testInput.trim() || isTyping) return;

    const userText = testInput.trim();
    setTestMessages((prev) => [...prev, { sender: 'user' as const, text: userText }]);
    setTestInput('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/chat/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText, customerPhone: '+5492910001122' }),
      });

      if (res.ok) {
        const data = await res.json();
        setTestMessages((prev) => [
          ...prev,
          { sender: 'bot', text: data.reply || 'Respuesta generada correctamente.' },
        ]);
      } else {
        setTestMessages((prev) => [
          ...prev,
          { sender: 'bot', text: 'Lo siento, hubo un problema al consultar el catálogo. Intenta nuevamente.' },
        ]);
      }
    } catch {
      setTestMessages((prev) => [
        ...prev,
        { sender: 'bot', text: 'Error conectando con el servicio de IA.' },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-outline-variant/30">
        <div>
          <span className="font-headline text-xs uppercase tracking-wider text-secondary font-bold">
            Bahía Blanca • Inteligencia Artificial
          </span>
          <h1 className="font-headline font-bold text-2xl text-on-surface mt-0.5">
            Bot IA Shokunin & Asistente Virtual
          </h1>
          <p className="text-xs text-on-surface-variant">
            Configura el modelo de atención automática, guardrails de celiaquía y simula respuestas en vivo.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-surface-container-low px-3 py-2 rounded-xl border border-outline-variant/30">
          <span className="text-xs font-headline font-bold">
            {botActive ? 'Bot Activo' : 'Bot Pausado'}
          </span>
          <button
            onClick={() => setBotActive(!botActive)}
            className={`w-9 h-5 rounded-full transition-colors relative flex items-center p-0.5 ${
              botActive ? 'bg-tertiary' : 'bg-outline-variant'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                botActive ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Configuration & Guardrails */}
        <div className="space-y-5">
          <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30 space-y-4">
            <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-primary">psychology</span>
              Personalidad y Prompt del Sistema
            </h3>

            <div>
              <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
                Modo de Asesoramiento:
              </label>
              <select
                value={personality}
                onChange={(e) => setPersonality(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none"
              >
                <option value="shokunin_sommelier">Itamae Sommelier (Refinado, culinario y detallista)</option>
                <option value="direct_commercial">Asesor Ágil (Conciso, enfocado en cerrar el pedido)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
                Instrucciones Base (System Prompt):
              </label>
              <textarea
                rows={6}
                value={promptInstructions}
                onChange={(e) => setPromptInstructions(e.target.value)}
                className="w-full p-3 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none leading-relaxed"
              />
            </div>
          </div>

          {/* Quick Rules */}
          <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30 space-y-3">
            <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-tertiary">bolt</span>
              Reglas de Disparo Directo (Slash Commands)
            </h3>

            <div className="space-y-2">
              {rules.map((rule) => (
                <div key={rule.id} className="p-3 rounded-xl bg-surface-container border border-outline-variant/30 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-primary">{rule.trigger}</span>
                    {rule.escalate && (
                      <span className="text-[9px] bg-error-container text-error px-1.5 py-0.2 rounded-full font-bold">
                        ⚠️ Deriva a Humano
                      </span>
                    )}
                  </div>
                  <p className="text-on-surface-variant text-[11px] leading-relaxed">{rule.response}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Live Interactive Simulator */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30 flex flex-col h-[560px]">
          <div className="pb-3 border-b border-outline-variant/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
              <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface">
                Simulador del Asistente en Tiempo Real
              </h3>
            </div>
            <span className="text-[10px] text-on-surface-variant">Conectado a BD</span>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {testMessages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-sm leading-relaxed whitespace-pre-line ${
                    m.sender === 'user'
                      ? 'bg-primary text-white rounded-tr-sm'
                      : 'bg-surface-container-high text-on-surface rounded-tl-sm border border-outline-variant/30'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex items-center gap-1.5 text-xs text-on-surface-variant pl-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.2s]" />
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.4s]" />
                <span className="text-[10px]">Shokunin consultando carta...</span>
              </div>
            )}
          </div>

          {/* Input Bar */}
          <form onSubmit={handleTestSend} className="pt-3 border-t border-outline-variant/20 flex gap-2">
            <input
              type="text"
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              placeholder="Prueba preguntar: '¿Qué me recomendás?', 'Tengo alergia', '/zonas'..."
              className="flex-1 px-3.5 py-2.5 text-xs rounded-xl bg-surface-container border border-outline-variant/40 text-on-surface focus:outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={isTyping || !testInput.trim()}
              className="px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-headline font-bold flex items-center gap-1 hover:bg-primary/90 disabled:opacity-50 transition-all shadow-sm"
            >
              <span>Probar</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
