import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { message, customerPhone } = await req.json();
    if (!message) {
      return NextResponse.json({ error: 'Mensaje requerido' }, { status: 400 });
    }

    const lower = message.toLowerCase();

    // 1. Regla de Escalado a Humano (Alérgenos o solicitud de asesor)
    const needsHuman =
      lower.includes('humano') ||
      lower.includes('asesor') ||
      lower.includes('alergia') ||
      lower.includes('alérgico') ||
      lower.includes('celiaco') ||
      lower.includes('celíaco');

    if (needsHuman) {
      return NextResponse.json({
        reply:
          '⚠️ He detectado una consulta prioritaria de alérgenos o solicitud de atención personalizada. He derivado tu conversación con urgencia a un asesor del equipo humano de Yankun Lab para garantizar tu seguridad alimentaria.',
        escalatedToHuman: true,
      });
    }

    // 2. Razonamiento Culinario Sommelier
    if (lower.includes('akazu') || lower.includes('arroz')) {
      return NextResponse.json({
        reply:
          'El vinagre rojo Akazu (赤酢) se fermenta a partir de lías de sake maduradas durante 3 años. Otorga al shari un aroma a madera tostada y un balance umami que combina a la perfección con pescados grasos como el salmón rosado y el atún rojo.',
        escalatedToHuman: false,
      });
    }

    if (lower.includes('recomendas') || lower.includes('omakase') || lower.includes('sugerencia')) {
      return NextResponse.json({
        reply:
          'Nuestra recomendación insigne para hoy es el "Omakase Signature Roll" (salmón flambeado al soplete con emulsión de maracuyá y batata crocante) maridado con Té Matcha Ceremonial de Uji en frío.',
        escalatedToHuman: false,
      });
    }

    return NextResponse.json({
      reply:
        '¡Un placer saludarte! En Yankun Sushi Lab combinamos tradición Edo con técnicas Nikkei contemporáneas. ¿Te gustaría conocer detalles sobre nuestras piezas, salsas de autor o zonas de entrega?',
      escalatedToHuman: false,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
