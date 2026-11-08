import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createSessionToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, pin, mode = 'credentials' } = body;

    // 1. PIN Master Mode (for physical tablets in kitchen)
    if (mode === 'pin') {
      const masterPin = process.env.ADMIN_PIN_MASTER || '888888';
      if (pin === masterPin) {
        const token = await createSessionToken({
          userId: 'usr_tablet_001',
          email: 'cocina@yankunsushi.com',
          name: 'Terminal Cocina (Tablet)',
          role: 'COCINERO',
        });

        const res = NextResponse.json({ success: true, user: { name: 'Terminal Cocina', role: 'COCINERO' } });
        res.cookies.set('yankun_admin_token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24 * 7, // 7 days
        });
        return res;
      } else {
        return NextResponse.json({ error: 'PIN Maestro incorrecto' }, { status: 401 });
      }
    }

    // 2. Email & Password Mode (High Security)
    if (!email || !password) {
      return NextResponse.json({ error: 'Ingresa email y contraseña' }, { status: 400 });
    }

    // Default owner fallback check
    const defaultEmail = process.env.ADMIN_DEFAULT_EMAIL || 'admin@yankunsushi.com';
    const defaultPass = process.env.ADMIN_DEFAULT_PASSWORD || 'adminYankun2026!';

    let matchedUser = null;

    if (email.toLowerCase() === defaultEmail.toLowerCase() && password === defaultPass) {
      matchedUser = {
        id: 'usr_admin_001',
        email: defaultEmail,
        name: 'Itamae Yankun (Master Owner)',
        role: 'SUPERADMIN',
      };
    } else {
      // Query User table in Supabase
      const { data: dbUser } = await supabase
        .from('User')
        .select('*')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (dbUser && dbUser.passwordHash) {
        const valid = await bcrypt.compare(password, dbUser.passwordHash);
        if (valid) {
          matchedUser = {
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name,
            role: dbUser.role,
          };
        }
      }
    }

    if (!matchedUser) {
      return NextResponse.json({ error: 'Credenciales inválidas. Verifica email y contraseña.' }, { status: 401 });
    }

    const token = await createSessionToken({
      userId: matchedUser.id,
      email: matchedUser.email,
      name: matchedUser.name,
      role: matchedUser.role,
    });

    const res = NextResponse.json({ success: true, user: matchedUser });
    res.cookies.set('yankun_admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.set('yankun_admin_token', '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/',
  });
  return res;
}
