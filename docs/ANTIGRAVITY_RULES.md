# Reglas e Instrucciones para Antigravity / Cursor / Windsurf

Este documento contiene las reglas estrictas de ingeniería y convenciones de código para construir la plataforma **Yankun Sushi Lab**.

---

## 1. Convenciones de Arquitectura y Stack
- **Framework:** Next.js 15+ (App Router).
- **Lenguaje:** TypeScript en modo estricto (`strict: true`).
- **Estilos:** Tailwind CSS con la paleta de tokens "Artisanal Japanese Craft" (Superficie oscura/clara de contraste suave, primario carmesí #a62216, acentos dorados/bronce #755a2a, fondos orgánicos #fff8f6 / #1f1b1a).
- **Base de Datos:** PostgreSQL con Prisma ORM.
- **Iconografía:** Lucide React o Material Symbols (Rounded).
- **Manejo de Estado:**
  - Carrito y personalización: `zustand` con persistencia en `localStorage`.
  - Notificaciones y eventos en tiempo real: Server-Sent Events (SSE) o Pusher / Socket.io.

---

## 2. Reglas de Componentes Mobile-First (Cliente)
1. **Experiencia App Nativa:**
   - La barra de navegación inferior (`BottomNav`) es fija en pantallas móviles (`fixed bottom-0 left-0 right-0 z-50`).
   - El botón flotante de Carrito debe mostrar cantidad de piezas y subtotal con animación sutil al agregar items.
   - Todo selector de piezas debe admitir modal tipo "BottomSheet" para selección de salsa, palillos, jengibre/wasabi y modificaciones dietarias (ej. "Sin sésamo", "Celíaco friendly").
2. **Checkout Rápido:**
   - Geolocalización asistida por Google Places Autocomplete.
   - Validación instantánea de zona de delivery con polígonos.
   - Selector claro entre "Envío a Domicilio" y "Retiro en Local (Take Away)".

---

## 3. Reglas del CRM Administrativo (Dashboard)
1. **Layout y Permisos:**
   - Sidebar lateral colapsable con accesos a: Métricas, Pedidos en Vivo (KDS), Catálogo, Clientes, Zonas de Envío, Chat Omnicanal (WhatsApp/IG), Configuración de Bot y Medios de Pago.
   - Autenticación con JWT / NextAuth / Supabase Auth con roles (`SUPERADMIN`, `ADMIN_LOCAL`, `COCINERO`, `REPARTIDOR`).
2. **KDS de Cocina:**
   - Actualización sin recargar la página (revalidación por SSE o WebSockets).
   - Botón de cambio de estado rápido de comanda con un solo toque.
   - Impresión configurable (Web Bluetooth / Socket a bridge local ESC/POS).
3. **Editor de Zonas:**
   - Google Maps JavaScript API Drawing Manager para trazar polígonos.
   - Exportación e importación en formato GeoJSON.

---

## 4. Reglas para Integraciones de Terceros
- **Mercado Pago:**
  - Todas las credenciales van en variables de entorno (`MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY`).
  - Nunca procesar pagos directamente en el cliente; generar la preferencia en `/api/payments/mercadopago` y retornar `init_point`.
- **WhatsApp Cloud API:**
  - El webhook en `/api/webhooks/whatsapp` debe responder `200 OK` inmediatamente tras verificar el challenge y procesar el payload de forma asíncrona.
