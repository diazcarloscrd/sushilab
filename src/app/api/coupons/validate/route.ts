import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { code, subtotal = 0 } = await req.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ valid: false, message: 'Código no provisto' }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();

    const { data: coupon, error } = await supabaseServer
      .from('Coupon')
      .select('*')
      .eq('code', cleanCode)
      .maybeSingle();

    if (error || !coupon) {
      return NextResponse.json({ valid: false, message: 'Cupón inexistente' }, { status: 404 });
    }

    if (!coupon.active) {
      return NextResponse.json({ valid: false, message: 'Este cupón se encuentra inactivo' }, { status: 400 });
    }

    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return NextResponse.json({ valid: false, message: 'Este cupón ha caducado' }, { status: 400 });
    }

    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return NextResponse.json({ valid: false, message: 'Este cupón ha alcanzado el límite máximo de usos' }, { status: 400 });
    }

    if (subtotal < coupon.minOrder) {
      return NextResponse.json({
        valid: false,
        message: `El pedido mínimo para aplicar este cupón es de $${coupon.minOrder.toLocaleString('es-AR')}`,
      }, { status: 400 });
    }

    return NextResponse.json({
      valid: true,
      code: coupon.code,
      discountPercent: coupon.discountPercent,
      discountAmount: coupon.discountAmount,
      message: `¡Cupón ${coupon.code} aplicado con éxito!`,
    });
  } catch (err: any) {
    return NextResponse.json({ valid: false, message: err.message }, { status: 500 });
  }
}
