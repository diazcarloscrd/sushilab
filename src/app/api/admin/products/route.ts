import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { getAdminSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD') // Descomponer tildes y diacríticos
    .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos ("Salmón" -> "salmon")
    .replace(/ñ/g, 'n')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session || session.role === 'COCINERO') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data, error } = await supabaseServer
      .from('Product')
      .select('*, category:Category(*)')
      .order('createdAt', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session || session.role === 'COCINERO') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      description,
      price,
      costPrice = 0,
      stock = 50,
      piecesCount = 1,
      categoryId,
      image,
      isChefSelection = false,
      isBestSeller = false,
      dietaryTags = [],
      modifiersJson,
      active = true,
    } = body;

    if (!name || !price || !categoryId) {
      return NextResponse.json({ error: 'Nombre, precio y categoría requeridos' }, { status: 400 });
    }

    const baseSlug = generateSlug(name);
    const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;

    const { data, error } = await supabaseServer
      .from('Product')
      .insert({
        name,
        slug,
        description: description || '',
        price: parseFloat(price),
        costPrice: parseFloat(costPrice) || 0,
        stock: parseInt(stock) || 50,
        piecesCount: parseInt(piecesCount) || 1,
        categoryId,
        image: image || 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=600&q=80',
        isChefSelection,
        isBestSeller,
        dietaryTags,
        modifiersJson: typeof modifiersJson === 'string' ? modifiersJson : JSON.stringify(modifiersJson || {}),
        active,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    console.error('Error creating product:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session || session.role === 'COCINERO') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { id, active, price, costPrice, stock, name, description } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID de producto requerido' }, { status: 400 });
    }

    const updatePayload: any = { updatedAt: new Date().toISOString() };
    if (active !== undefined) updatePayload.active = active;
    if (price !== undefined) updatePayload.price = parseFloat(price);
    if (costPrice !== undefined) updatePayload.costPrice = parseFloat(costPrice);
    if (stock !== undefined) {
      updatePayload.stock = parseInt(stock);
      if (parseInt(stock) === 0) {
        updatePayload.active = false; // Auto-pausar si stock es 0
      }
    }
    if (name) updatePayload.name = name;
    if (description !== undefined) updatePayload.description = description;

    const { data, error } = await supabaseServer
      .from('Product')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session || session.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Se requieren permisos de Superadmin' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID de producto requerido' }, { status: 400 });
    }

    const { error } = await supabaseServer
      .from('Product')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true, message: 'Producto eliminado correctamente' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
