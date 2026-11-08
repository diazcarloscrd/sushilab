import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { getAdminSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session || (session.role !== 'SUPERADMIN' && session.role !== 'ADMIN_LOCAL')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data: user, error } = await supabaseServer
      .from('User')
      .select('id, email, name, role')
      .eq('id', session.userId)
      .maybeSingle();

    if (error || !user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      user,
      kitchenPin: process.env.ADMIN_PIN_MASTER || '888888',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session || (session.role !== 'SUPERADMIN' && session.role !== 'ADMIN_LOCAL')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { name, email, newPassword, confirmPassword } = body;

    const updates: any = {};
    if (name && typeof name === 'string') {
      updates.name = name.trim();
    }

    if (email && typeof email === 'string') {
      updates.email = email.toLowerCase().trim();
    }

    if (newPassword) {
      if (typeof newPassword !== 'string' || newPassword.length < 8) {
        return NextResponse.json(
          { error: 'La nueva contraseña debe tener al menos 8 caracteres' },
          { status: 400 }
        );
      }
      if (newPassword !== confirmPassword) {
        return NextResponse.json(
          { error: 'Las contraseñas no coinciden' },
          { status: 400 }
        );
      }
      updates.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ message: 'Nada para actualizar' });
    }

    updates.updatedAt = new Date().toISOString();

    const { error: updateError } = await supabaseServer
      .from('User')
      .update(updates)
      .eq('id', session.userId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      message: 'Perfil y credenciales actualizados exitosamente.',
      updated: { name: updates.name, email: updates.email },
    });
  } catch (err: any) {
    console.error('Error al actualizar perfil admin:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
