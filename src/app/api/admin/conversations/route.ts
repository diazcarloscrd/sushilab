import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: conversations, error } = await supabaseServer
      .from('Conversation')
      .select('*')
      .order('lastMessageAt', { ascending: false });

    if (error) throw error;
    return NextResponse.json(conversations || []);
  } catch (err: any) {
    console.error('Error fetching conversations:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerPhone, botActive, markRead } = body;

    if (!customerPhone) {
      return NextResponse.json({ error: 'Teléfono requerido' }, { status: 400 });
    }

    const updates: any = { updatedAt: new Date().toISOString() };
    if (typeof botActive === 'boolean') {
      updates.botActive = botActive;
    }
    if (markRead) {
      updates.unreadCount = 0;
    }

    const { data, error } = await supabaseServer
      .from('Conversation')
      .update(updates)
      .eq('customerPhone', customerPhone)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Error updating conversation:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
