import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data, error } = await supabaseServer
      .from('Product')
      .select('*, category:Category(*)')
      .eq('active', true)
      .gt('stock', 0)
      .order('price', { ascending: true });

    if (error) {
      console.error('Supabase get products error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err: any) {
    console.error('API products error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
