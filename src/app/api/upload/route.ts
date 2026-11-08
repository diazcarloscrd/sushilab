import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Archivo no recibido' }, { status: 400 });
    }

    // Validar tipo de imagen
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Formato no soportado. Sube una imagen en JPG, PNG o WEBP.' },
        { status: 400 }
      );
    }

    // Límite de tamaño: 10 MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'El archivo excede el tamaño máximo permitido (10 MB).' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `proof_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

    const { data, error } = await supabaseServer.storage
      .from('payment-proofs')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      throw error;
    }

    const { data: publicUrlData } = supabaseServer.storage
      .from('payment-proofs')
      .getPublicUrl(data.path);

    return NextResponse.json({ url: publicUrlData.publicUrl });
  } catch (err: any) {
    console.error('Error subiendo comprobante a Storage:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
