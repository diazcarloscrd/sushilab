import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('Product')
      .select('*, category:Category(*)')
      .eq('active', true)
      .order('price', { ascending: true });

    if (error) {
      console.error('Supabase get products error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('API products error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
