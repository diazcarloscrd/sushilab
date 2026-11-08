import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { message, customerPhone } = await req.json();
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Mensaje requerido' }, { status: 400 });
    }

    const lower = message.toLowerCase().trim();

    // 1. Guardrail Crítico de Seguridad Alimentaria (Alérgenos / Celiaquía)
    const isAllergy =
      lower.includes('alergia') ||
      lower.includes('alérgico') ||
      lower.includes('alergica') ||
      lower.includes('celiaco') ||
      lower.includes('celíaco') ||
      lower.includes('sin tacc') ||
      lower.includes('gluten') ||
      lower.includes('marisco') ||
      lower.includes('asesor') ||
      lower.includes('humano');

    if (isAllergy) {
      // Si el cliente tiene teléfono, pausar el bot en su conversación para que atienda un humano
      if (customerPhone) {
        await supabaseServer
          .from('Conversation')
          .update({ botActive: false, updatedAt: new Date().toISOString() })
          .eq('customerPhone', customerPhone);
      }

      return NextResponse.json({
        reply:
          '⚠️ ALERTA DE SEGURIDAD ALIMENTARIA SHOKUNIN:\n' +
          'Hemos detectado una consulta prioritaria sobre alérgenos o solicitud de atención personalizada. Para tu máxima protección, pausamos la asistencia automática y derivamos tu chat con prioridad alta a nuestro equipo en Bahía Blanca para coordinar tu comanda en un espacio sanitizado libre de contaminación cruzada.',
        escalatedToHuman: true,
      });
    }

    // 2. Consulta de Zonas de Entrega en Bahía Blanca
    if (lower.includes('zona') || lower.includes('envio') || lower.includes('envío') || lower.includes('costo') || lower.includes('demora')) {
      const { data: zones } = await supabaseServer
        .from('DeliveryZone')
        .select('name, deliveryFee, estimatedMin, estimatedMax')
        .eq('active', true)
        .order('deliveryFee', { ascending: true });

      let reply = '📍 Zonas de entrega directa en Bahía Blanca:\n\n';
      zones?.forEach((z) => {
        reply += `• ${z.name}: $${z.deliveryFee.toLocaleString('es-AR')} (Demora aprox. ${z.estimatedMin}-${z.estimatedMax} min)\n`;
      });
      reply += '\n🍣 O puedes retirar por nuestro local en Alsina 350 con un 15% de descuento en Take Away.';

      return NextResponse.json({ reply, escalatedToHuman: false });
    }

    // 3. Recomendaciones y Búsqueda en Catálogo Real de la BD
    if (lower.includes('recomendas') || lower.includes('omakase') || lower.includes('carta') || lower.includes('menu') || lower.includes('menú') || lower.includes('roll')) {
      const { data: products } = await supabaseServer
        .from('Product')
        .select('name, price, description, piecesCount, isChefSelection, isBestSeller')
        .eq('active', true);

      const highlights = products?.filter((p) => p.isChefSelection || p.isBestSeller) || [];
      const topPick = highlights[0] || products?.[0];

      if (topPick) {
        const reply =
          `🍱 Nuestra sugerencia insigne para hoy es el "${topPick.name}" (${topPick.piecesCount || 10} piezas) a $${topPick.price.toLocaleString('es-AR')}.\n\n` +
          `${topPick.description}\n\n` +
          `¿Deseas agregarlo a tu carrito o consultar opciones vegetarianas o sin gluten?`;
        return NextResponse.json({ reply, escalatedToHuman: false });
      }
    }

    // 4. Consulta sobre el Arroz Akazu o Técnicas Edo
    if (lower.includes('akazu') || lower.includes('arroz') || lower.includes('vinagre')) {
      return NextResponse.json({
        reply:
          'En Yankun Bahía Blanca utilizamos shari sazonado con vinagre rojo Akazu (赤酢), fermentado a partir de lías de sake maduradas durante 3 años. Otorga al arroz un matiz ambarino profundo y un aroma umami que potencia la grasa noble del salmón rosado fresco.',
        escalatedToHuman: false,
      });
    }

    // 5. Horarios del local
    if (lower.includes('horario') || lower.includes('abierto') || lower.includes('abre')) {
      const { data: setting } = await supabaseServer
        .from('StoreSetting')
        .select('value')
        .eq('key', 'STORE_OPEN_HOURS')
        .maybeSingle();

      return NextResponse.json({
        reply: `Nuestro horario de atención en Bahía Blanca es: ${setting?.value || 'Martes a Domingo de 19:30 a 23:45 hs'}. ¡Puedes hacer tu pedido en vivo o programarlo en la web!`,
        escalatedToHuman: false,
      });
    }

    // 6. Respuesta de Bienvenida General
    return NextResponse.json({
      reply:
        '¡Hola! Te damos la bienvenida a Yankun Sushi Lab — Bahía Blanca. Elaboramos sushi de autor combinando técnicas milenarias Edo y toques Nikkei contemporáneos. ¿En qué podemos ayudarte hoy? Puedes consultarme sobre nuestras piezas insignes, alérgenos o zonas de entrega.',
      escalatedToHuman: false,
    });
  } catch (err: any) {
    console.error('Error en Chatbot IA:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
