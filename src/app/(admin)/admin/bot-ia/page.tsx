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
    `Eres el Sommelier y Asesor de Autor de Yankun Sushi Lab.
Tu propósito es asesorar al comensal sobre el menú Shokunin, los matices del arroz fermentado en vinagre rojo Akazu, maridajes de salsas artesanales y recomendaciones Omakase.
Mantén siempre un tono refinado, cálido y conciso.
REGLA CRÍTICA DE SEGURIDAD: Si el cliente reporta alergias severas (mariscos, celiaquía estricta, frutos secos) o solicita hablar con un asesor humano, activa inmediatamente la derivación a un operador del local.`
  );

  const [rules, setRules] = useState<BotRuleItem[]>([
    {
      id: 'r1',
      trigger: '/alergias',
      response:
        '⚠️ Alerta Celíacos y Alérgenos: Nuestros rolls se preparan con estricta sanitización y opciones sin TACC con salsa de soja especial. Si tienes alergias severas a mariscos o frutos secos, te derivamos con el Itamae.',
      escalate: true,
      active: true,
    },
    {
      id: 'r2',
      trigger: '/zonas',
      response:
        '📍 Zonas de entrega directa: Palermo Soho ($1.200), Recoleta ($1.500) y Belgrano ($1.800). Retiro en Local disponible con 15% OFF.',
      escalate: false,
      active: true,
    },
    {
      id: 'r3',
      trigger: '/horarios',
      response: '🕒 Martes a Domingo de 19:30 a 23:45 hs. Pedidos programados en nuestra Web App.',
      escalate: false,
      active: true,
    },
  ]);

  // Test Simulator state
  const [testMessages, setTestMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string }>>([
    {
      sender: 'bot',
      text: 'Konbanwa (Buenas noches). Soy el Asesor Virtual de Yankun Sushi Lab 鮨. ¿En qué puedo guiarte hoy respecto a nuestra carta de autor?',
    },
  ]);
  const [testInput, setTestInput] = useState('');

  const handleTestSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testInput.trim()) return;

    const userText = testInput.trim();
    const newChat = [...testMessages, { sender: 'user' as const, text: userText }];
    setTestMessages(newChat);
    setTestInput('');

    // Rule matcher or AI simulation
    setTimeout(() => {
      const lower = userText.toLowerCase();

      // Check for human escalation triggers
      if (lower.includes('humano') || lower.includes('asesor') || lower.includes('alergia') || lower.includes('alergico')) {
        setTestMessages((prev) => [
          ...prev,
          {
            sender: 'bot',
            text: '⚠️ He detectado una solicitud prioritaria de seguridad / atención personalizada. Un asesor del equipo humano de Yankun Lab te responderá de inmediato por este canal.',
          },
        ]);
        return;
      }

      // Check rules
      const matchedRule = rules.find((r) => r.active && lower.includes(r.trigger.toLowerCase()));
      if (matchedRule) {
        setTestMessages((prev) => [...prev, { sender: 'bot', text: matchedRule.response }]);
        return;
      }

      // Fallback AI gastronomic reply
      if (lower.includes('akazu') || lower.includes('arroz')) {
        setTestMessages((prev) => [
          ...prev,
          {
            sender: 'bot',
            text: 'El vinagre rojo Akazu es elaborado a base de lías de sake añejadas durante 3 años en barricas. Aporta un tono rojizo sutil y un umami incomparable que realza la untuosidad de nuestros pescados grasos como el salmón rosado y la trucha patagónica.',
          },
        ]);
      } else if (lower.includes('recomendas') || lower.includes('omakase')) {
        setTestMessages((prev) => [
          ...prev,
          {
            sender: 'bot',
            text: 'Para esta noche te recomiendo iniciar con nuestro "Omakase Signature Roll" (salmón flambeado y reducción de maracuyá) seguido por los Nigiris de Salmón Trufado con shari Akazu.',
          },
        ]);
      } else {
        setTestMessages((prev) => [
          ...prev,
          {
            sender: 'bot',
            text: `Con gusto te asisto sobre "${userText}". Recuerda que todos nuestros pedidos online tienen seguimiento en vivo y puedes aplicar el cupón KANSO15 para 15% OFF.`,
          },
        ]);
      }
    }, 600);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-outline-variant/30">
        <div>
          <span className="font-headline text-xs uppercase tracking-wider text-secondary font-bold">
            Inteligencia Gastronómica
          </span>
          <h1 className="font-headline font-bold text-2xl text-on-surface mt-0.5">
            Bot Shokunin IA & Derivación a Humano
          </h1>
          <p className="text-xs text-on-surface-variant">
            Configura el comportamiento del chatbot para WhatsApp e Instagram con Vercel AI SDK y reglas de seguridad.
          </p>
        </div>

        <button
          onClick={() => setBotActive(!botActive)}
          className={`px-4 py-2 rounded-full font-headline text-xs font-bold transition-all ${
            botActive
              ? 'bg-tertiary text-white shadow-sm'
              : 'bg-surface-container text-on-surface-variant'
          }`}
        >
          {botActive ? '✓ Bot IA Habilitado' : 'Bot IA en Pausa'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Configuration Form (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Personality settings */}
          <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30 space-y-4">
            <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface-variant">
              Personalidad & Instrucciones del Sommelier
            </h3>

            <div>
              <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
                Tono Culinario:
              </label>
              <select
                value={personality}
                onChange={(e) => setPersonality(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary"
              >
                <option value="shokunin_sommelier">Shokunin Tradicional & Sommelier de Autor (Recomendado)</option>
                <option value="modern_fast">Moderno, Rápido y Directo a la Venta</option>
                <option value="minimalist">Minimalista Zen Japonés</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
                System Prompt (Instrucciones Maestras del LLM):
              </label>
              <textarea
                rows={6}
                value={promptInstructions}
                onChange={(e) => setPromptInstructions(e.target.value)}
                className="w-full p-3 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary font-mono leading-relaxed"
              />
            </div>
          </div>

          {/* Fixed Rules & Escalation */}
          <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-card border border-outline-variant/30 space-y-3">
            <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-secondary">
              Respuestas Rápidas & Escalado Humano
            </h3>

            <div className="space-y-2">
              {rules.map((rule) => (
                <div key={rule.id} className="p-3 rounded-xl bg-surface-container text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-headline font-bold text-primary font-mono">
                      {rule.trigger}
                    </span>
                    {rule.escalate && (
                      <span className="text-[9px] font-headline font-bold px-1.5 py-0.2 rounded-full bg-error-container text-on-error-container">
                        Deriva a Asesor Humano
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-on-surface-variant">{rule.response}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Interactive Test Simulator (5 cols) */}
        <div className="lg:col-span-5 bg-surface-container-lowest rounded-2xl p-4 shadow-card border border-outline-variant/30 flex flex-col h-[580px]">
          <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20 mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-tertiary" />
              <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface">
                Simulador de Chat en Vivo
              </h3>
            </div>
            <button
              onClick={() =>
                setTestMessages([
                  {
                    sender: 'bot',
                    text: 'Konbanwa. Soy el Asesor Virtual de Yankun Sushi Lab 鮨. ¿En qué puedo guiarte hoy respecto a nuestra carta de autor?',
                  },
                ])
              }
              className="text-[10px] text-on-surface-variant hover:underline"
            >
              Reiniciar
            </button>
          </div>

          {/* Simulator message stream */}
          <div className="flex-1 overflow-y-auto space-y-2.5 p-2 bg-surface rounded-xl">
            {testMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] p-2.5 rounded-xl text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-primary text-white rounded-tr-none'
                      : 'bg-surface-container-high text-on-surface rounded-tl-none border border-outline-variant/20'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          {/* Simulator input */}
          <form onSubmit={handleTestSend} className="pt-3 flex gap-2">
            <input
              type="text"
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              placeholder="Prueba preguntar por 'akazu', '/alergias'..."
              className="flex-1 px-3 py-2 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary"
            />
            <button
              type="submit"
              className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary-container active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
