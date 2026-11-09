import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { getAdminSession } from '@/lib/auth';
import { generateSlug, validateCategoryInput } from '@/lib/catalog/utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const includeInactive = searchParams.get('all') === 'true';

    let query = supabaseServer
      .from('Category')
      .select('*, products:Product(id, active)')
      .order('order', { ascending: true });

    if (!includeInactive) {
      query = query.eq('active', true);
    }

    const { data, error } = await query;
    if (error) throw error;

    const formatted = (data || []).map((cat: any) => ({
      ...cat,
      productsCount: Array.isArray(cat.products) ? cat.products.length : 0,
      activeProductsCount: Array.isArray(cat.products)
        ? cat.products.filter((p: any) => p.active).length
        : 0,
    }));

    return NextResponse.json(formatted);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session || session.role === 'COCINERO' || session.role === 'REPARTIDOR') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const validation = validateCategoryInput(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const name = body.name.trim();
    const order = typeof body.order === 'number' ? body.order : 0;
    const active = body.active !== undefined ? Boolean(body.active) : true;
    const imageUrl = body.imageUrl || null;

    const baseSlug = generateSlug(name);
    const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;

    const { data, error } = await supabaseServer
      .from('Category')
      .insert({
        name,
        slug,
        order,
        active,
        imageUrl,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    console.error('Error creating category:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session || session.role === 'COCINERO' || session.role === 'REPARTIDOR') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { id, name, order, active, imageUrl } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID de categoría requerido' }, { status: 400 });
    }

    const updatePayload: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (name !== undefined) {
      const trimmed = String(name).trim();
      if (!trimmed) {
        return NextResponse.json({ error: 'El nombre no puede estar vacío' }, { status: 400 });
      }
      updatePayload.name = trimmed;
      updatePayload.slug = `${generateSlug(trimmed)}-${Math.random().toString(36).substring(2, 6)}`;
    }

    if (order !== undefined) {
      updatePayload.order = Number(order);
    }

    if (active !== undefined) {
      updatePayload.active = Boolean(active);
    }

    if (imageUrl !== undefined) {
      updatePayload.imageUrl = imageUrl;
    }

    const { data, error } = await supabaseServer
      .from('Category')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Error updating category:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session || (session.role !== 'SUPERADMIN' && session.role !== 'ADMIN_LOCAL')) {
      return NextResponse.json({ error: 'Se requieren permisos de Administrador' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID de categoría requerido' }, { status: 400 });
    }

    // Check if category has associated products
    const { data: existingProducts, error: checkError } = await supabaseServer
      .from('Product')
      .select('id, name')
      .eq('categoryId', id);

    if (checkError) throw checkError;

    if (existingProducts && existingProducts.length > 0) {
      return NextResponse.json(
        {
          error: `No se puede eliminar la categoría porque tiene ${existingProducts.length} producto(s) asignado(s). Reasigna o elimina los productos primero.`,
        },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabaseServer
      .from('Category')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true, message: 'Categoría eliminada con éxito' });
  } catch (err: any) {
    console.error('Error deleting category:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
