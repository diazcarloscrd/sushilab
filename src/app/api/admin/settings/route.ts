import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data, error } = await supabaseServer
      .from('StoreSetting')
      .select('*')
      .order('key', { ascending: true });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Error fetching admin settings:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { settings } = body; // Array of { key, value } or object of key-value

    if (!settings) {
      return NextResponse.json({ error: 'Configuración no provista' }, { status: 400 });
    }

    const updates = Array.isArray(settings)
      ? settings
      : Object.entries(settings).map(([key, value]) => ({ key, value: String(value) }));

    for (const item of updates) {
      await supabaseServer
        .from('StoreSetting')
        .upsert(
          { key: item.key, value: item.value, updatedAt: new Date().toISOString() },
          { onConflict: 'key' }
        );
    }

    return NextResponse.json({ success: true, message: 'Parámetros actualizados exitosamente' });
  } catch (err: any) {
    console.error('Error updating admin settings:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
