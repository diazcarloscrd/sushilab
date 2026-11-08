# Yankun Sushi Lab — Ecosistema Completo de Pedidos & CRM

Este repositorio contiene la arquitectura completa, modelos de datos, reglas para Antigravity y estructura de código lista para implementar.

## Contenido de este paquete:
1. `docs/PRD_YANKUN_SUSHI.md`: Especificación técnica, flujos de usuario y reglas de negocio.
2. `docs/ANTIGRAVITY_RULES.md`: Instrucciones y estándares para el desarrollo en Antigravity / Cursor.
3. `docs/schema.prisma`: Modelo de base de datos relacional para PostgreSQL con Prisma.
4. `src/lib/geo.ts`: Algoritmo de detección de punto en polígono para Google Maps (costos de envío dinámicos).
5. `src/lib/printer.ts`: Formateador ESC/POS para comandera térmica de cocina.
6. `src/app/`: Estructura Next.js App Router dividida en Cliente `(client)`, Administración `(admin)` y Webhooks `api/`.
7. `assets_originales/`: Pantallas de referencia visual y diseños del concepto de marca.

## Puesta en marcha rápida:
```bash
npm install
npm run prisma:generate
npm run dev
```
