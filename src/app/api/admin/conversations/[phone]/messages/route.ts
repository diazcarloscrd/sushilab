import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  try {
    const { phone } = await params;

    const { data: messages, error } = await supabaseServer
      .from('ChatMessage')
      .select('*')
      .eq('customerPhone', phone)
      .order('createdAt', { ascending: true });

    if (error) throw error;
    return NextResponse.json(messages || []);
  } catch (err: any) {
    console.error('Error fetching conversation messages:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  try {
    const { phone } = await params;
    const body = await req.json();
    const { text, channel = 'WHATSAPP' } = body;

    if (!text?.trim()) {
      return NextResponse.json({ error: 'Mensaje vacío' }, { status: 400 });
    }

    // 1. Asentar mensaje saliente en la base de datos
    const { data: createdMsg, error: msgErr } = await supabaseServer
      .from('ChatMessage')
      .insert({
        customerPhone: phone,
        text: text.trim(),
        channel,
        senderType: 'AGENT',
        status: 'SENT',
      })
      .select()
      .single();

    if (msgErr) throw msgErr;

    // 2. Actualizar última actividad en la conversación
    await supabaseServer
      .from('Conversation')
      .update({
        lastMessageText: text.trim(),
        lastMessageAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .eq('customerPhone', phone);

    // 3. Si están las credenciales de WhatsApp Cloud API, enviar vía Meta
    const waToken = process.env.WHATSAPP_TOKEN;
    const waPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (waToken && waPhoneId && waToken.trim() !== '' && !waToken.includes('...')) {
      try {
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        await fetch(`https://graph.facebook.com/v18.0/${waPhoneId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${waToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: cleanPhone,
            type: 'text',
            text: { body: text.trim() },
          }),
        });
      } catch (metaErr) {
        console.warn('Advertencia al enviar a WhatsApp Cloud API:', metaErr);
      }
    }

    return NextResponse.json(createdMsg, { status: 201 });
  } catch (err: any) {
    console.error('Error sending agent message:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
