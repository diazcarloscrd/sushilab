import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseServer } from '@/lib/supabaseServer';
import { createRedeemToken } from '@/lib/loyalty/token';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phone, code } = body;

    if (!phone || !code) {
      return NextResponse.json({ error: 'Teléfono y código requeridos' }, { status: 400 });
    }

    const cleanPhone = phone.trim();
    const cleanCode = code.trim();

    // 1. Buscar último OTP vigente para este teléfono
    const { data: otps, error } = await supabaseServer
      .from('OtpCode')
      .select('*')
      .eq('phone', cleanPhone)
      .eq('purpose', 'REDEEM')
      .is('consumedAt', null)
      .order('createdAt', { ascending: false })
      .limit(1);

    if (error || !otps || otps.length === 0) {
      return NextResponse.json({ error: 'No se encontró un código pendiente o ya fue utilizado' }, { status: 400 });
    }

    const otpRecord = otps[0];

    // Verificar expiración
    if (new Date(otpRecord.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'El código ha expirado. Solicite uno nuevo.' }, { status: 400 });
    }

    // Verificar intentos (máximo 5)
    if (otpRecord.attempts >= 5) {
      return NextResponse.json({ error: 'Demasiados intentos fallidos. Solicite un nuevo código.' }, { status: 403 });
    }

    // Calcular hash del código ingresado
    const pepper = process.env.JWT_SECRET || 'yankun_otp_pepper_2026';
    const computedHash = crypto.createHash('sha256').update(`${cleanCode}:${pepper}`).digest('hex');

    // Comparación timingSafeEqual
    const hashBuf = Buffer.from(computedHash);
    const expectedBuf = Buffer.from(otpRecord.codeHash);

    const matches = hashBuf.length === expectedBuf.length && crypto.timingSafeEqual(hashBuf, expectedBuf);

    if (!matches) {
      // Incrementar intentos fallidos
      await supabaseServer
        .from('OtpCode')
        .update({ attempts: otpRecord.attempts + 1 })
        .eq('id', otpRecord.id);

      const remainingAttempts = 5 - (otpRecord.attempts + 1);
      return NextResponse.json(
        { error: `Código incorrecto. Le quedan ${Math.max(0, remainingAttempts)} intentos.` },
        { status: 400 }
      );
    }

    // Código válido -> Marcar consumido
    await supabaseServer
      .from('OtpCode')
      .update({ consumedAt: new Date().toISOString() })
      .eq('id', otpRecord.id);

    // Generar JWT redeemToken de 15 minutos
    const redeemToken = await createRedeemToken(cleanPhone, otpRecord.id);

    return NextResponse.json({
      success: true,
      redeemToken,
      message: 'Código verificado con éxito',
    });
  } catch (err: any) {
    console.error('Error in /api/loyalty/verify:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
