import { PrismaClient, Role, DeliveryType, OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🍣 Iniciando sembrado artesanal de Yankun Sushi Lab...');

  // 1. Limpieza de datos existentes
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.deliveryZone.deleteMany();
  await prisma.user.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.botRule.deleteMany();
  await prisma.storeSetting.deleteMany();

  // 2. Administrador Principal
  const passwordHash = await bcrypt.hash('adminYankun2026!', 10);
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@yankunsushi.com',
      name: 'Itamae Yankun (Master Owner)',
      passwordHash,
      role: Role.SUPERADMIN,
      active: true,
    },
  });
  console.log('✅ Usuario Administrador creado:', adminUser.email);

  // 3. Categorías Shokunin
  const catOmakase = await prisma.category.create({
    data: {
      name: 'Recomendados Omakase',
      slug: 'omakase',
      order: 1,
      imageUrl: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=600&q=80',
    },
  });

  const catNigiris = await prisma.category.create({
    data: {
      name: 'Nigiris & Rolls',
      slug: 'rolls',
      order: 2,
      imageUrl: 'https://images.unsplash.com/photo-1611143669185-af224c5e3252?auto=format&fit=crop&w=600&q=80',
    },
  });

  const catCombos = await prisma.category.create({
    data: {
      name: 'Combos Especiales',
      slug: 'combos',
      order: 3,
      imageUrl: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=600&q=80',
    },
  });

  const catEntradas = await prisma.category.create({
    data: {
      name: 'Gyozas & Entradas',
      slug: 'entradas',
      order: 4,
      imageUrl: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?auto=format&fit=crop&w=600&q=80',
    },
  });

  const catBebidas = await prisma.category.create({
    data: {
      name: 'Bebidas & Té',
      slug: 'bebidas',
      order: 5,
      imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80',
    },
  });

  // 4. Modificadores estándar para piezas
  const standardModifiers = JSON.stringify({
    baseRice: [
      { id: 'akazu', name: 'Arroz fermentado en Akazu rojo (Vinagre añejado)', extraPrice: 600, default: true },
      { id: 'clasico', name: 'Arroz Shari tradicional al vinagre blanco', extraPrice: 0, default: false }
    ],
    sauces: [
      { id: 'teriyaki', name: 'Teriyaki artesanal reducida', extraPrice: 0, default: true },
      { id: 'ponzu', name: 'Ponzu cítrica con togarashi', extraPrice: 300, default: false },
      { id: 'soja_baja', name: 'Soja baja en sodio', extraPrice: 0, default: true },
      { id: 'spicy_mayo', name: 'Spicy Mayo con aceite de sésamo', extraPrice: 350, default: false }
    ],
    extras: [
      { id: 'palta_hass', name: 'Extra Palta Hass laminada', price: 950 },
      { id: 'masago_caviar', name: 'Caviar Masago crocante', price: 1400 },
      { id: 'hon_wasabi', name: 'Hon Wasabi fresco rallado en piel de tiburón', price: 1200 },
      { id: 'jengibre', name: 'Gari jengibre encurtido artesanal', price: 400 }
    ]
  });

  // 5. Productos de Autor
  const products = [
    {
      name: 'Omakase Signature Roll',
      slug: 'omakase-signature-roll',
      description: 'Salmón flambeado al soplete, palta hass, queso crema artesanal, reducción de maracuyá y crocante de batata dorada.',
      price: 14500,
      costPrice: 4200,
      piecesCount: 10,
      categoryId: catOmakase.id,
      isChefSelection: true,
      isBestSeller: true,
      image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=800&q=80',
      modifiersJson: standardModifiers,
      dietaryTags: ['OMAKASE', 'BESTSELLER']
    },
    {
      name: 'Nigiri Salmón Trufado Akazu',
      slug: 'nigiri-salmon-trufado-akazu',
      description: 'Salmón rosado chileno sellado con aceite de trufa blanca orgánica, sal marina de Maldon y shari macerado en vinagre rojo Akazu.',
      price: 12800,
      costPrice: 3600,
      piecesCount: 6,
      categoryId: catNigiris.id,
      isChefSelection: true,
      isBestSeller: true,
      image: 'https://images.unsplash.com/photo-1611143669185-af224c5e3252?auto=format&fit=crop&w=800&q=80',
      modifiersJson: standardModifiers,
      dietaryTags: ['CHEF_SELECTION', 'GF']
    },
    {
      name: 'Geishas Flambeadas Shokunin',
      slug: 'geishas-flambeadas-shokunin',
      description: 'Finas láminas de salmón selladas al fuego directo, rellenas de langostino crocante y queso brie, con salsa unagi y ciboulette fresco.',
      price: 13200,
      costPrice: 3900,
      piecesCount: 5,
      categoryId: catNigiris.id,
      isChefSelection: true,
      isBestSeller: true,
      image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=800&q=80',
      modifiersJson: standardModifiers,
      dietaryTags: ['BESTSELLER']
    },
    {
      name: 'Moriawase Yankun Premium',
      slug: 'moriawase-yankun-premium',
      description: 'Selección suprema del Itamae: 6 nigiris trufados de trucha y salmón, 8 rolls Omakase Signature, 6 geishas y 4 sashimi de pulpo español.',
      price: 28500,
      costPrice: 8200,
      piecesCount: 24,
      categoryId: catCombos.id,
      isChefSelection: true,
      isBestSeller: true,
      image: 'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=800&q=80',
      modifiersJson: standardModifiers,
      dietaryTags: ['OMAKASE', 'CHEF_SELECTION']
    },
    {
      name: 'Combo Tokyo Nigiri & Roll',
      slug: 'combo-tokyo-nigiri-roll',
      description: 'Equilibrio clásico para dos: 5 nigiris clásicos de salmón, 5 rolls Philadelphia con sésamo tostado y 5 rolls Spicy Tuna tempura.',
      price: 18900,
      costPrice: 5400,
      piecesCount: 15,
      categoryId: catCombos.id,
      isChefSelection: false,
      isBestSeller: false,
      image: 'https://images.unsplash.com/photo-1534482421-64566f976cfa?auto=format&fit=crop&w=800&q=80',
      modifiersJson: standardModifiers,
      dietaryTags: ['POPULAR']
    },
    {
      name: 'Gyozas Artesanales de Cerdo & Shiso',
      slug: 'gyozas-cerdo-shiso',
      description: '5 empanadillas japonesas cocidas al vapor y doradas a la plancha con costra crujiente, rellenas de bondiola especiada y hierba shiso.',
      price: 7800,
      costPrice: 2100,
      piecesCount: 5,
      categoryId: catEntradas.id,
      isChefSelection: false,
      isBestSeller: true,
      image: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?auto=format&fit=crop&w=800&q=80',
      modifiersJson: standardModifiers,
      dietaryTags: ['ENTRADA']
    },
    {
      name: 'Bao de Salmón Glaseado Teriyaki',
      slug: 'bao-salmon-teriyaki',
      description: 'Dos suaves panes taiwaneses al vapor con dados de salmón sellados al wok, pepino kyuri encurtido y emulsión de sriracha suave.',
      price: 8500,
      costPrice: 2400,
      piecesCount: 2,
      categoryId: catEntradas.id,
      isChefSelection: false,
      isBestSeller: false,
      image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=800&q=80',
      modifiersJson: standardModifiers,
      dietaryTags: ['ENTRADA']
    },
    {
      name: 'Té Matcha Orgánico Ceremonial Frío',
      slug: 'te-matcha-ceremonial-frio',
      description: 'Té verde puro de grado ceremonial traído de Uji, Kioto. Infusión lenta en frío con suave toque de lima kaffir y menta fresca.',
      price: 3200,
      costPrice: 700,
      piecesCount: 1,
      categoryId: catBebidas.id,
      isChefSelection: false,
      isBestSeller: false,
      image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80',
      modifiersJson: null,
      dietaryTags: ['VEGAN', 'BEBIDA']
    }
  ];

  for (const p of products) {
    await prisma.product.create({ data: p });
  }
  console.log(`✅ ${products.length} Productos de autor creados con escandallo y modificadores.`);

  // 6. Zonas de Entrega con Polígonos de Cobertura (CABA: Palermo, Recoleta, Belgrano)
  const palermoPolygon = [
    { lat: -34.5750, lng: -58.4350 },
    { lat: -34.5780, lng: -58.4150 },
    { lat: -34.5950, lng: -58.4200 },
    { lat: -34.5980, lng: -58.4420 }
  ];

  const recoletaPolygon = [
    { lat: -34.5820, lng: -58.4050 },
    { lat: -34.5880, lng: -58.3850 },
    { lat: -34.6020, lng: -58.3950 },
    { lat: -34.5960, lng: -58.4120 }
  ];

  const belgranoPolygon = [
    { lat: -34.5550, lng: -58.4600 },
    { lat: -34.5600, lng: -58.4400 },
    { lat: -34.5760, lng: -58.4480 },
    { lat: -34.5700, lng: -58.4700 }
  ];

  const zonePalermo = await prisma.deliveryZone.create({
    data: {
      name: 'Zona 1: Palermo Soho & Hollywood',
      polygonGeoJson: JSON.stringify(palermoPolygon),
      deliveryFee: 1200,
      minOrder: 10000,
      estimatedMin: 25,
      estimatedMax: 35,
      active: true,
    },
  });

  await prisma.deliveryZone.create({
    data: {
      name: 'Zona 2: Recoleta & Barrio Norte',
      polygonGeoJson: JSON.stringify(recoletaPolygon),
      deliveryFee: 1500,
      minOrder: 12000,
      estimatedMin: 30,
      estimatedMax: 40,
      active: true,
    },
  });

  await prisma.deliveryZone.create({
    data: {
      name: 'Zona 3: Belgrano & Colegiales',
      polygonGeoJson: JSON.stringify(belgranoPolygon),
      deliveryFee: 1800,
      minOrder: 14000,
      estimatedMin: 35,
      estimatedMax: 45,
      active: true,
    },
  });
  console.log('✅ Zonas de reparto con polígonos geoespaciales inicializadas.');

  // 7. Cliente de prueba con pedido de demostración para el KDS
  const customer = await prisma.customer.create({
    data: {
      phone: '+5491144445555',
      name: 'Valentina Rossi',
      email: 'valentina.rossi@email.com',
      deliveryAddress: 'Honduras 4850, 4to B, Palermo Soho',
      ordersCount: 2,
      totalSpent: 42300,
    },
  });

  const demoOrder = await prisma.order.create({
    data: {
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      deliveryType: DeliveryType.DELIVERY,
      deliveryAddress: customer.deliveryAddress,
      deliveryZoneId: zonePalermo.id,
      deliveryFee: 1200,
      subtotal: 27300,
      discount: 0,
      total: 28500,
      status: OrderStatus.EN_COCINA,
      paymentMethod: PaymentMethod.MERCADO_PAGO,
      paymentStatus: PaymentStatus.APROBADO,
      notes: 'Sin sésamo en los rolls, palillos y extra wasabi fresco por favor.',
      estimatedMinutes: 30,
    },
  });

  await prisma.orderItem.create({
    data: {
      orderId: demoOrder.id,
      name: 'Omakase Signature Roll (10 piezas)',
      price: 14500,
      quantity: 1,
      baseRice: 'Arroz fermentado en Akazu rojo',
      saucesJson: JSON.stringify(['Teriyaki artesanal', 'Ponzu']),
      extrasJson: JSON.stringify(['Hon Wasabi fresco']),
      notes: 'Sin sésamo',
    },
  });

  await prisma.orderItem.create({
    data: {
      orderId: demoOrder.id,
      name: 'Nigiri Salmón Trufado Akazu (6 piezas)',
      price: 12800,
      quantity: 1,
      baseRice: 'Arroz fermentado en Akazu rojo',
      saucesJson: JSON.stringify(['Soja baja en sodio']),
      extrasJson: JSON.stringify([]),
    },
  });
  console.log('✅ Pedido inicial de demostración cargado en el KDS de Cocina.');

  // 8. Reglas de Chatbot
  await prisma.botRule.create({
    data: {
      triggerKeyword: '/alergias',
      responseText: '⚠️ Atención de Seguridad Shokunin: Todos nuestros rolls pueden adaptarse celíaco-friendly ("GF") con salsa de soja sin TACC. Si posees alergia al marisco, sésamo o lácteos, por favor avísanos para que el Itamae prepare tu comanda en un espacio sanitizado independiente.',
      isAiHandled: false,
      escalateToHuman: true,
      active: true,
    },
  });

  await prisma.botRule.create({
    data: {
      triggerKeyword: '/zonas',
      responseText: '📍 Nuestras zonas de entrega directa cubren Palermo Soho/Hollywood ($1.200), Recoleta ($1.500) y Belgrano ($1.800). Si estás fuera de estas áreas, puedes optar por "Retiro en Local (Take Away)" con un 15% de descuento directo.',
      isAiHandled: false,
      escalateToHuman: false,
      active: true,
    },
  });

  await prisma.botRule.create({
    data: {
      triggerKeyword: '/horarios',
      responseText: '🕒 Horario de Servicio Yankun Sushi Lab: Martes a Domingo de 19:30 a 23:45 hs. Pedidos programados disponibles durante todo el día desde nuestra Web App.',
      isAiHandled: false,
      escalateToHuman: false,
      active: true,
    },
  });

  // 9. Parámetros del Negocio
  const settings = [
    { key: 'STORE_NAME', value: 'Yankun Sushi Lab — Sushi de Autor' },
    { key: 'STORE_IS_OPEN', value: 'true' },
    { key: 'BANK_CBU', value: '0000003100012345678901' },
    { key: 'BANK_ALIAS', value: 'YANKUN.SUSHI.LAB' },
    { key: 'BANK_HOLDER', value: 'Yankun Gastronomia SRL' },
    { key: 'WHATSAPP_SUPPORT', value: '+5491155556666' },
    { key: 'TAKEAWAY_DISCOUNT_PERCENT', value: '15' }
  ];

  for (const s of settings) {
    await prisma.storeSetting.create({ data: s });
  }

  console.log('🍣 Sembrado artesanal completado exitosamente.');
}

main()
  .catch((e) => {
    console.error('Error durante el sembrado:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
