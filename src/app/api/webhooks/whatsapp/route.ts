import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET: Verificación de Webhook de Meta Cloud API
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'yankun_secure_token';

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('WhatsApp Webhook verificado correctamente');
    return new Response(challenge, { status: 200 });
  }

  return new Response('Forbidden', { status: 403 });
}

// POST: Procesamiento de mensajes entrantes
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Responder 200 OK de forma inmediata según convención de ingeniería
    const entries = body.entry;
    if (entries && entries.length > 0) {
      for (const entry of entries) {
        const changes = entry.changes;
        if (changes) {
          for (const change of changes) {
            const value = change.value;
            const messages = value?.messages;
            if (messages && messages.length > 0) {
              const msg = messages[0];
              const fromPhone = msg.from;
              const text = msg.text?.body || '';

              // Guardar mensaje en base de datos asíncronamente
              await supabase.from('ChatMessage').insert({
                channel: 'WHATSAPP',
                senderType: 'CUSTOMER',
                text,
                customerPhone: fromPhone,
                status: 'RECEIVED',
              });

              console.log(`WhatsApp recibido de ${fromPhone}: "${text}"`);
            }
          }
        }
      }
    }

    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch (err: any) {
    console.error('Error procesando webhook WhatsApp:', err);
    // Siempre retornar 200 a Meta para evitar retries descontrolados
    return NextResponse.json({ status: 'error_logged' }, { status: 200 });
  }
}
