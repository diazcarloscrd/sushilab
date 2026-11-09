import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { getAdminSession } from '@/lib/auth';
import { generateSlug } from '@/lib/catalog/utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session || session.role === 'COCINERO' || session.role === 'REPARTIDOR') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      const { data, error } = await supabaseServer
        .from('Product')
        .select('*, category:Category(*)')
        .eq('id', id)
        .single();

      if (error) throw error;
      return NextResponse.json(data);
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
    if (!session || session.role === 'COCINERO' || session.role === 'REPARTIDOR') {
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
      recipeEnabled = false,
    } = body;

    if (!name || price === undefined || !categoryId) {
      return NextResponse.json({ error: 'Nombre, precio y categoría requeridos' }, { status: 400 });
    }

    const baseSlug = generateSlug(name);
    const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;

    const { data, error } = await supabaseServer
      .from('Product')
      .insert({
        name: name.trim(),
        slug,
        description: description || '',
        price: parseFloat(price),
        costPrice: parseFloat(costPrice) || 0,
        stock: parseInt(stock) || 0,
        piecesCount: parseInt(piecesCount) || 1,
        categoryId,
        image: image || 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=600&q=80',
        isChefSelection: Boolean(isChefSelection),
        isBestSeller: Boolean(isBestSeller),
        dietaryTags: Array.isArray(dietaryTags) ? dietaryTags : [],
        modifiersJson: typeof modifiersJson === 'string' ? modifiersJson : JSON.stringify(modifiersJson || {}),
        active: Boolean(active),
        recipeEnabled: Boolean(recipeEnabled),
      })
      .select('*, category:Category(*)')
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
    if (!session || session.role === 'COCINERO' || session.role === 'REPARTIDOR') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const {
      id,
      name,
      description,
      price,
      costPrice,
      stock,
      piecesCount,
      categoryId,
      image,
      isChefSelection,
      isBestSeller,
      dietaryTags,
      modifiersJson,
      active,
      recipeEnabled,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID de producto requerido' }, { status: 400 });
    }

    const updatePayload: Record<string, any> = { updatedAt: new Date().toISOString() };

    if (name !== undefined) {
      updatePayload.name = String(name).trim();
      updatePayload.slug = `${generateSlug(String(name).trim())}-${Math.random().toString(36).substring(2, 6)}`;
    }
    if (description !== undefined) updatePayload.description = description;
    if (price !== undefined) updatePayload.price = parseFloat(price);
    if (costPrice !== undefined) updatePayload.costPrice = parseFloat(costPrice);
    if (stock !== undefined) {
      const stockNum = parseInt(stock);
      updatePayload.stock = stockNum;
      if (stockNum === 0) {
        updatePayload.autoPaused = true;
      } else {
        updatePayload.autoPaused = false;
      }
    }
    if (piecesCount !== undefined) updatePayload.piecesCount = parseInt(piecesCount) || 1;
    if (categoryId !== undefined) updatePayload.categoryId = categoryId;
    if (image !== undefined) updatePayload.image = image;
    if (isChefSelection !== undefined) updatePayload.isChefSelection = Boolean(isChefSelection);
    if (isBestSeller !== undefined) updatePayload.isBestSeller = Boolean(isBestSeller);
    if (dietaryTags !== undefined) updatePayload.dietaryTags = Array.isArray(dietaryTags) ? dietaryTags : [];
    if (modifiersJson !== undefined) {
      updatePayload.modifiersJson = typeof modifiersJson === 'string' ? modifiersJson : JSON.stringify(modifiersJson || {});
    }
    if (active !== undefined) updatePayload.active = Boolean(active);
    if (recipeEnabled !== undefined) updatePayload.recipeEnabled = Boolean(recipeEnabled);

    const { data, error } = await supabaseServer
      .from('Product')
      .update(updatePayload)
      .eq('id', id)
      .select('*, category:Category(*)')
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Error updating product:', err);
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
      return NextResponse.json({ error: 'ID de producto requerido' }, { status: 400 });
    }

    // Check if product is referenced in orders (soft-delete safeguard)
    const { data: orderRefs, error: orderErr } = await supabaseServer
      .from('OrderItem')
      .select('id')
      .eq('productId', id)
      .limit(1);

    if (orderErr) {
      console.warn('Could not check OrderItem relation, continuing:', orderErr.message);
    }

    if (orderRefs && orderRefs.length > 0) {
      // Soft-delete / archive
      const { data, error } = await supabaseServer
        .from('Product')
        .update({
          active: false,
          autoPaused: true,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({
        success: true,
        archived: true,
        message: 'El producto posee historial en comandas. Fue archivado y desactivado del menú para proteger la integridad.',
        product: data,
      });
    }

    const { error } = await supabaseServer
      .from('Product')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true, message: 'Producto eliminado correctamente' });
  } catch (err: any) {
    console.error('Error deleting product:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
