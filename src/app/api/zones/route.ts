import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('DeliveryZone')
      .select('*')
      .order('deliveryFee', { ascending: true });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Error fetching delivery zones:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, polygonGeoJson, deliveryFee = 0, minOrder = 0, estimatedMin = 25, estimatedMax = 45, active = true } = body;

    const { data, error } = await supabase
      .from('DeliveryZone')
      .insert({
        name,
        polygonGeoJson: typeof polygonGeoJson === 'string' ? polygonGeoJson : JSON.stringify(polygonGeoJson),
        deliveryFee,
        minOrder,
        estimatedMin,
        estimatedMax,
        active,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    console.error('Error creating delivery zone:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, polygonGeoJson, deliveryFee, minOrder, estimatedMin, estimatedMax, active } = body;

    const { data, error } = await supabase
      .from('DeliveryZone')
      .update({
        name,
        polygonGeoJson: typeof polygonGeoJson === 'string' ? polygonGeoJson : JSON.stringify(polygonGeoJson),
        deliveryFee,
        minOrder,
        estimatedMin,
        estimatedMax,
        active,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Error updating delivery zone:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    const { error } = await supabase.from('DeliveryZone').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting delivery zone:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
