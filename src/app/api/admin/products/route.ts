import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data, error } = await supabase
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
    const body = await req.json();
    const {
      name,
      description,
      price,
      costPrice = 0,
      piecesCount = 1,
      categoryId,
      image,
      isChefSelection = false,
      isBestSeller = false,
      dietaryTags = [],
      modifiersJson,
      active = true,
    } = body;

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    const { data, error } = await supabase
      .from('Product')
      .insert({
        name,
        slug: `${slug}-${Date.now().toString().slice(-4)}`,
        description,
        price: parseFloat(price),
        costPrice: parseFloat(costPrice) || 0,
        piecesCount: parseInt(piecesCount) || 1,
        categoryId,
        image,
        isChefSelection,
        isBestSeller,
        dietaryTags,
        modifiersJson: typeof modifiersJson === 'string' ? modifiersJson : JSON.stringify(modifiersJson),
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
    const body = await req.json();
    const { id, active, price, costPrice } = body;

    const updatePayload: any = {};
    if (active !== undefined) updatePayload.active = active;
    if (price !== undefined) updatePayload.price = parseFloat(price);
    if (costPrice !== undefined) updatePayload.costPrice = parseFloat(costPrice);

    const { data, error } = await supabase
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
