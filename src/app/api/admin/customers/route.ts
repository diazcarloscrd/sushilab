import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { getAdminSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const segment = searchParams.get('segment');
    const marketingOnly = searchParams.get('marketingOnly') === 'true';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
    const offset = (page - 1) * limit;

    let query = supabaseServer
      .from('Customer')
      .select('*', { count: 'exact' })
      .order('lastOrderAt', { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1);

    if (segment) {
      query = query.eq('segment', segment);
    }
    if (marketingOnly) {
      query = query.eq('marketingConsent', true);
    }
    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      customers: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
