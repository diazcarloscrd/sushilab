import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import {
  createSessionToken,
  getAdminSession,
  checkRateLimit,
  recordFailedAttempt,
  resetRateLimit,
} from '@/lib/auth';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
    return NextResponse.json({ authenticated: true, user: session });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    const body = await req.json();
    const { email, password, pin, mode = 'credentials' } = body;

    // 1. PIN Mode (para tablets de cocina físicas)
    if (mode === 'pin') {
      const pinRateLimitKey = `pin_attempt_${ip}`;
      const rateCheck = checkRateLimit(pinRateLimitKey, 5, 15 * 60 * 1000, 15 * 60 * 1000);

      if (!rateCheck.allowed) {
        return NextResponse.json(
          {
            error: `Demasiados intentos de PIN fallidos. Bloqueado por seguridad durante ${rateCheck.retryAfterSec} segundos.`,
          },
          { status: 429 }
        );
      }

      if (!pin || typeof pin !== 'string') {
        return NextResponse.json({ error: 'PIN requerido' }, { status: 400 });
      }

      const configuredPin = process.env.ADMIN_PIN_MASTER || '888888';

      // Comparación segura
      if (pin.trim() !== configuredPin.trim()) {
        recordFailedAttempt(pinRateLimitKey, 5, 15 * 60 * 1000, 15 * 60 * 1000);
        return NextResponse.json(
          {
            error: `PIN Maestro incorrecto. Intentos restantes: ${rateCheck.remaining - 1}`,
          },
          { status: 401 }
        );
      }

      resetRateLimit(pinRateLimitKey);

      const token = await createSessionToken({
        userId: 'usr_tablet_cocina',
        email: 'cocina@yankunsushi.com',
        name: 'Terminal Cocina (Tablet)',
        role: 'COCINERO',
      });

      const res = NextResponse.json({
        success: true,
        user: { name: 'Terminal Cocina', role: 'COCINERO' },
      });

      res.cookies.set('yankun_admin_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      });

      return res;
    }

    // 2. Email & Password Mode (para Administradores y Dueños)
    if (!email || !password) {
      return NextResponse.json({ error: 'Ingresa email y contraseña' }, { status: 400 });
    }

    let cleanEmail = email.toLowerCase().trim();
    if (
      cleanEmail === 'admin@yankun' ||
      cleanEmail === 'admin' ||
      cleanEmail === 'admin@yankunsushi' ||
      cleanEmail === 'admin@yankunsushilab.com'
    ) {
      cleanEmail = 'admin@yankunsushi.com';
    }
    const loginRateLimitKey = `login_attempt_${ip}_${cleanEmail}`;
    const rateCheck = checkRateLimit(loginRateLimitKey, 5, 15 * 60 * 1000, 15 * 60 * 1000);

    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: `Demasiados intentos fallidos. Cuenta bloqueada temporalmente por ${rateCheck.retryAfterSec} segundos.`,
        },
        { status: 429 }
      );
    }

    // Consultar tabla User en Supabase con cliente seguro de servidor
    const { data: dbUser, error: userError } = await supabaseServer
      .from('User')
      .select('id, email, name, passwordHash, role, active')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (userError || !dbUser || !dbUser.active) {
      recordFailedAttempt(loginRateLimitKey, 5, 15 * 60 * 1000, 15 * 60 * 1000);
      return NextResponse.json(
        { error: 'Credenciales inválidas. Verifica email y contraseña.' },
        { status: 401 }
      );
    }

    const passwordValid = await bcrypt.compare(password, dbUser.passwordHash);
    if (!passwordValid) {
      recordFailedAttempt(loginRateLimitKey, 5, 15 * 60 * 1000, 15 * 60 * 1000);
      return NextResponse.json(
        { error: 'Credenciales inválidas. Verifica email y contraseña.' },
        { status: 401 }
      );
    }

    resetRateLimit(loginRateLimitKey);

    const token = await createSessionToken({
      userId: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role,
    });

    const res = NextResponse.json({
      success: true,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
      },
    });

    res.cookies.set('yankun_admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (err: any) {
    console.error('Error en autenticación admin:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ success: true, message: 'Sesión cerrada correctamente' });
  res.cookies.set('yankun_admin_token', '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/',
  });
  return res;
}
