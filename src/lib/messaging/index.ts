import { supabaseServer } from '@/lib/supabaseServer';

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface MessagingProvider {
  sendOtp(phone: string, code: string): Promise<SendMessageResult>;
  sendText(phone: string, text: string): Promise<SendMessageResult>;
  sendTemplate(phone: string, templateName: string, vars: Record<string, any>): Promise<SendMessageResult>;
}

class DevMessagingProvider implements MessagingProvider {
  async sendOtp(phone: string, code: string): Promise<SendMessageResult> {
    const content = `Tu código de seguridad para canje de puntos Yankun Sushi es: ${code}. Válido por 5 minutos.`;
    console.log(`[DEV MESSAGING] OTP a ${phone}: ${code}`);

    try {
      await supabaseServer.from('DevOutbox').insert({
        id: `dev_msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        phone,
        purpose: 'OTP',
        content,
        metadata: JSON.stringify({ code }),
        createdAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error('[DEV MESSAGING] Error guardando en DevOutbox:', e);
    }

    return { success: true, messageId: `dev_otp_${Date.now()}` };
  }

  async sendText(phone: string, text: string): Promise<SendMessageResult> {
    console.log(`[DEV MESSAGING] Texto a ${phone}: ${text}`);
    try {
      await supabaseServer.from('DevOutbox').insert({
        id: `dev_msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        phone,
        purpose: 'TEXT',
        content: text,
        metadata: JSON.stringify({}),
        createdAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error('[DEV MESSAGING] Error guardando en DevOutbox:', e);
    }
    return { success: true, messageId: `dev_text_${Date.now()}` };
  }

  async sendTemplate(phone: string, templateName: string, vars: Record<string, any>): Promise<SendMessageResult> {
    console.log(`[DEV MESSAGING] Plantilla "${templateName}" a ${phone}:`, vars);
    try {
      await supabaseServer.from('DevOutbox').insert({
        id: `dev_msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        phone,
        purpose: `TEMPLATE_${templateName}`,
        content: JSON.stringify(vars),
        metadata: JSON.stringify({ templateName, vars }),
        createdAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error('[DEV MESSAGING] Error guardando en DevOutbox:', e);
    }
    return { success: true, messageId: `dev_tpl_${Date.now()}` };
  }
}

class WhatsAppCloudProvider implements MessagingProvider {
  private phoneNumberId: string;
  private accessToken: string;

  constructor() {
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
  }

  async sendOtp(phone: string, code: string): Promise<SendMessageResult> {
    if (!this.phoneNumberId || !this.accessToken) {
      console.warn('[WhatsAppCloud] Credenciales no configuradas. Usando driver dev de respaldo.');
      return new DevMessagingProvider().sendOtp(phone, code);
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');

    try {
      const res = await fetch(`https://graph.facebook.com/v21.0/${this.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: cleanPhone,
          type: 'template',
          template: {
            name: 'yankun_otp',
            language: { code: 'es_AR' },
            components: [
              {
                type: 'body',
                parameters: [{ type: 'text', text: code }],
              },
              {
                type: 'button',
                sub_type: 'url',
                index: '0',
                parameters: [{ type: 'text', text: code }],
              },
            ],
          },
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('[WhatsAppCloud] Error al enviar OTP:', errorData);
        return { success: false, error: JSON.stringify(errorData) };
      }

      const data = await res.json();
      return { success: true, messageId: data.messages?.[0]?.id };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async sendText(phone: string, text: string): Promise<SendMessageResult> {
    if (!this.phoneNumberId || !this.accessToken) {
      return new DevMessagingProvider().sendText(phone, text);
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');

    try {
      const res = await fetch(`https://graph.facebook.com/v21.0/${this.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: cleanPhone,
          type: 'text',
          text: { body: text },
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        return { success: false, error: JSON.stringify(errorData) };
      }

      const data = await res.json();
      return { success: true, messageId: data.messages?.[0]?.id };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async sendTemplate(phone: string, templateName: string, vars: Record<string, any>): Promise<SendMessageResult> {
    return this.sendText(phone, `[Template: ${templateName}] ${JSON.stringify(vars)}`);
  }
}

export function getMessagingProvider(): MessagingProvider {
  const driver = process.env.MESSAGING_DRIVER?.toLowerCase();
  if (driver === 'whatsapp_cloud') {
    return new WhatsAppCloudProvider();
  }
  return new DevMessagingProvider();
}
