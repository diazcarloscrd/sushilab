# Yankun Sushi Lab — Product Requirements Document (PRD)
**Proyecto:** App Mobile-First de Pedidos & CRM Administrativo Omnicanal  
**Marca:** Yankun Sushi Lab — Sushi de Autor  
**Versión:** 1.2.0  
**Stack Recomendado:** Next.js (App Router), TypeScript, Tailwind CSS, Prisma ORM, PostgreSQL (PostGIS), WebSockets / SSE.

---

## 1. Visión y Alcance
Yankun Sushi Lab es un ecosistema digital compuesto por:
1. **PWA Mobile-First para Clientes:** Experiencia de alta gama para navegación del menú de autor, personalización de rolls/piezas, carrito dinámico, checkout con geolocalización precisa y seguimiento en tiempo real.
2. **Panel CRM Administrativo & Centro de Control (Desktop/Web):**
   - Gestión de catálogo en tiempo real (piezas de autor, combos, bebidas, extras, opciones de personalización, badges de edición limitada).
   - Editor de zonas de entrega sobre Google Maps (polígonos personalizados con costos y tiempos estimados por zona).
   - Configuración de métodos de pago (Mercado Pago API, Transferencia bancaria con validación de comprobante, Efectivo).
   - Sistema dual para cocina: Kitchen Display System (KDS interactivo en pantalla) + Dispatcher para impresoras térmicas ESC/POS (tickets de comanda y tickets de despacho).
   - Bandeja unificada omnicanal (WhatsApp Business Cloud API e Instagram Messaging API).
   - Chatbot Híbrido Inteligente: menú de navegación por botones/opciones fijas, procesamiento de lenguaje natural con IA para pedidos y preguntas frecuentes, y botón de derivación inmediata a agente humano ("Hablar con una persona").

---

## 2. Definiciones Funcionales Específicas

### 2.1 Pasarelas y Medios de Pago
- **Mercado Pago Checkout Pro / API:** Generación dinámica de `preference_id`, webhook IPN con validación de firma criptográfica y actualización automática del pedido a estado `PAGADO`.
- **Transferencia Bancaria Inmediata:** Visualización de CBU/CVU/Alias. Formulario para adjuntar comprobante (imagen o PDF). El pedido entra en estado `PENDIENTE_VERIFICACION`. El operador en el CRM visualiza el comprobante con un clic y confirma la acreditación.
- **Efectivo / Pago contra entrega:** Opcional con especificación de monto para cambio.

### 2.2 Zonas de Entrega (Geofencing Google Maps)
- Los administradores dibujan polígonos ilimitados sobre el mapa de la ciudad.
- Cada polígono define:
  - Nombre de la zona (ej. "Centro / Macrocentro", "Zona Norte", "Patagonia").
  - Costo de envío ($).
  - Tiempo estimado de entrega (ej. "35 - 50 min").
  - Pedido mínimo requerido.
  - Estado (Activo / Inactivo).
- Al ingresar la dirección el cliente, el backend ejecuta el algoritmo Point-in-Polygon (PostGIS `ST_Contains` o algoritmo Ray-Casting) para determinar si la dirección está dentro de cobertura y calcular el costo de flete exacto.

### 2.3 Bot Híbrido Omnicanal (WhatsApp & Instagram)
- **Árbol de Respuestas Fijas:** Menú de inicio rápido (1. Ver Menú Digital, 2. Estado de mi Pedido, 3. Promociones del día, 4. Horarios y Ubicación, 5. Hablar con un asesor).
- **IA Conversacional (NLP/LLM):** Si el cliente escribe libremente (ej. "Hola, ¿tienen opciones vegetarianas o rolls sin queso Philadelphia?"), el bot consulta el catálogo y responde con tono de la marca.
- **Derivación a Humano:** En cualquier momento que el usuario escriba "humano", "asesor", "persona" o pulse el botón correspondiente, el bot pausa la respuesta automática para esa conversación (`bot_active = false`), emite alerta sonora en el CRM y transfiere el hilo a la bandeja de entrada humana.

### 2.4 Módulo de Cocina: KDS + Ticketera Térmica
- **KDS (Pantalla de Cocina):** Pantalla en tiempo real organizada en columnas Kanban (`Pendiente`, `En Preparación`, `Listo para Despacho`, `Entregado`). Muestra alertas por tiempo transcurrido (Verde: <15m, Amarillo: 15-30m, Rojo: >30m).
- **Impresión Térmica ESC/POS:** Servicio configurable para impresión automática al confirmar pedido o manual a demanda:
  - Comanda de cocina (detalles de piezas, personalizaciones, sin precios).
  - Ticket de entrega (datos del cliente, dirección, teléfono, detalle con precios y medio de pago).

---

## 3. Estados de un Pedido
1. `CREADO`: Iniciado en checkout.
2. `PENDIENTE_PAGO`: Esperando pago online o comprobante.
3. `PAGADO_CONFIRMADO`: Pago validado por webhook o verificado por admin.
4. `EN_COCINA`: Aceptado por cocina / KDS.
5. `EN_CAMINO`: Asignado a cadete / repartidor.
6. `ENTREGADO`: Entrega exitosa.
7. `CANCELADO`: Cancelado con devolución de stock si aplica.
