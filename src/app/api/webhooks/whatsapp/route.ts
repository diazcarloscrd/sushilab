import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// GET: Verificación del Webhook por Meta Cloud API
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const configuredToken = process.env.WHATSAPP_VERIFY_TOKEN || 'yankun_secure_token';

  if (mode === 'subscribe' && token === configuredToken) {
    console.log('✅ Webhook de WhatsApp verificado correctamente con Meta');
    return new Response(challenge, { status: 200 });
  }

  return new Response('Forbidden', { status: 403 });
}

// POST: Procesamiento seguro de mensajes entrantes (C7 Solución Definitiva)
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-hub-signature-256');
    const appSecret = process.env.META_APP_SECRET;

    // Validación Criptográfica HMAC-SHA256 si META_APP_SECRET está configurado
    if (appSecret && appSecret.trim() !== '') {
      if (!signature) {
        return NextResponse.json({ error: 'Firma de seguridad ausente' }, { status: 401 });
      }

      const expectedSignature = `sha256=${crypto
        .createHmac('sha256', appSecret)
        .update(rawBody)
        .digest('hex')}`;

      if (signature !== expectedSignature) {
        console.warn('⚠️ Webhook de WhatsApp rechazado: firma HMAC inválida');
        return NextResponse.json({ error: 'Firma no válida' }, { status: 401 });
      }
    }

    const body = JSON.parse(rawBody);
    const entries = body.entry || [];

    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        const value = change.value;
        const messages = value?.messages || [];
        const contact = value?.contacts?.[0];
        const contactName = contact?.profile?.name || null;

        for (const msg of messages) {
          const fromPhone = msg.from;
          const msgId = msg.id;
          const text = msg.text?.body || (msg.type === 'button' ? msg.button?.text : '') || '';

          if (!fromPhone || !text) continue;

          // 1. Deduplicación por message ID de Meta
          const { data: existingMsg } = await supabaseServer
            .from('ChatMessage')
            .select('id')
            .eq('id', msgId)
            .maybeSingle();

          if (existingMsg) {
            continue; // Mensaje ya procesado
          }

          // 2. Guardar mensaje en ChatMessage
          await supabaseServer.from('ChatMessage').insert({
            id: msgId,
            channel: 'WHATSAPP',
            senderType: 'CUSTOMER',
            text,
            customerPhone: fromPhone,
            customerName: contactName,
            status: 'RECEIVED',
          });

          // 3. Crear o actualizar la conversación en Conversation
          const { data: conv } = await supabaseServer
            .from('Conversation')
            .select('id, unreadCount, botActive')
            .eq('customerPhone', fromPhone)
            .maybeSingle();

          if (conv) {
            await supabaseServer
              .from('Conversation')
              .update({
                customerName: contactName || undefined,
                lastMessageText: text,
                lastMessageAt: new Date().toISOString(),
                unreadCount: (conv.unreadCount || 0) + 1,
                updatedAt: new Date().toISOString(),
              })
              .eq('id', conv.id);
          } else {
            await supabaseServer.from('Conversation').insert({
              customerPhone: fromPhone,
              customerName: contactName,
              channel: 'WHATSAPP',
              botActive: true,
              unreadCount: 1,
              lastMessageText: text,
              lastMessageAt: new Date().toISOString(),
            });
          }

          console.log(`📩 Mensaje procesado de WhatsApp [${fromPhone}]: "${text}"`);
        }
      }
    }

    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch (err: any) {
    console.error('Error procesando webhook de WhatsApp:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
