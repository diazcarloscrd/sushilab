import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseServer } from '@/lib/supabaseServer';
import { checkRateLimit } from '@/lib/rateLimit';
import { getMessagingProvider } from '@/lib/messaging';

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown_ip';
    const body = await req.json();
    const { phone } = body;

    if (!phone || typeof phone !== 'string' || phone.trim().length < 8) {
      return NextResponse.json({ error: 'Número de teléfono inválido' }, { status: 400 });
    }

    const cleanPhone = phone.trim();

    // 1. Rate limits: 10 por IP/hora y 3 por teléfono/hora
    const ipLimit = await checkRateLimit({
      key: `otp_ip_${ip}`,
      limit: 10,
      windowSeconds: 3600,
    });
    if (!ipLimit.allowed) {
      return NextResponse.json({ error: 'Demasiadas solicitudes desde esta conexión. Intente en 1 hora.' }, { status: 429 });
    }

    const phoneLimit = await checkRateLimit({
      key: `otp_phone_${cleanPhone}`,
      limit: 3,
      windowSeconds: 3600,
    });
    if (!phoneLimit.allowed) {
      return NextResponse.json({ error: 'Límite de intentos alcanzado para este teléfono. Intente en 1 hora.' }, { status: 429 });
    }

    // 2. Generar código de 6 dígitos seguro
    const code = crypto.randomInt(100000, 999999).toString();
    const pepper = process.env.JWT_SECRET || 'yankun_otp_pepper_2026';
    const codeHash = crypto.createHash('sha256').update(`${code}:${pepper}`).digest('hex');

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutos

    const otpId = `otp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    await supabaseServer.from('OtpCode').insert({
      id: otpId,
      phone: cleanPhone,
      purpose: 'REDEEM',
      codeHash,
      expiresAt: expiresAt.toISOString(),
      attempts: 0,
      createdAt: new Date().toISOString(),
    });

    // 3. Enviar mensaje por el proveedor
    const provider = getMessagingProvider();
    await provider.sendOtp(cleanPhone, code);

    const isDev = process.env.NODE_ENV !== 'production' && (process.env.MESSAGING_DRIVER === 'dev' || !process.env.MESSAGING_DRIVER);

    return NextResponse.json({
      success: true,
      message: 'Código enviado por WhatsApp',
      expiresInSeconds: 300,
      ...(isDev ? { devCode: code } : {}),
    });
  } catch (err: any) {
    console.error('Error in /api/loyalty/otp:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
