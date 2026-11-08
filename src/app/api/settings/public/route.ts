import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: settings, error } = await supabaseServer
      .from('StoreSetting')
      .select('key, value');

    if (error) throw error;

    // Convert array of key-value pairs into a clean object
    const config: Record<string, string> = {};
    settings?.forEach((s) => {
      config[s.key] = s.value;
    });

    return NextResponse.json({
      storeName: config.STORE_NAME || 'Yankun Sushi Lab — Bahía Blanca',
      storeAddress: config.STORE_ADDRESS || 'Alsina 350, Centro, Bahía Blanca',
      storeCity: config.STORE_CITY || 'Bahía Blanca, Buenos Aires',
      isOpen: config.STORE_IS_OPEN === 'true',
      openHours: config.STORE_OPEN_HOURS || 'Martes a Domingo de 19:30 a 23:45 hs',
      whatsapp: config.WHATSAPP_SUPPORT || '+5492915556677',
      takeawayDiscount: Number(config.TAKEAWAY_DISCOUNT_PERCENT || '15'),
      cashDiscount: Number(config.CASH_DISCOUNT_PERCENT || '10'),
      minOrderAmount: Number(config.MIN_ORDER_AMOUNT || '5000'),
      bankDetails: {
        cbu: config.BANK_CBU || '',
        alias: config.BANK_ALIAS || 'YANKUN.SUSHI.BBLA',
        holder: config.BANK_HOLDER || 'Yankun Gastronomia SRL',
      },
    });
  } catch (err: any) {
    console.error('Error fetching public settings:', err);
    return NextResponse.json(
      {
        storeName: 'Yankun Sushi Lab — Bahía Blanca',
        storeAddress: 'Alsina 350, Centro, Bahía Blanca',
        storeCity: 'Bahía Blanca, Buenos Aires',
        isOpen: true,
        openHours: 'Martes a Domingo de 19:30 a 23:45 hs',
        whatsapp: '+5492915556677',
        takeawayDiscount: 15,
        cashDiscount: 10,
        minOrderAmount: 5000,
        bankDetails: {
          cbu: '0000003100012345678901',
          alias: 'YANKUN.SUSHI.BBLA',
          holder: 'Yankun Gastronomia SRL',
        },
      },
      { status: 200 }
    );
  }
}
