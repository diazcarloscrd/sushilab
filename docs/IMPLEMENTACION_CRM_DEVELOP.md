# Implementación inicial de YanKun SushiLab CRM (develop)

## Cambios versionados
- Se agregan una capa compartida de estilos y utilidades de autenticación/formato/exportación.
- Se incorporan Clientes, Inventario y Reportes al espacio administrativo. Clientes y reportes consultan pedidos reales; no generan datos de demostración.
- Se agrega una migración aditiva para clientes, inventario, movimientos de stock, proveedores/compras, recetas/costos, gastos, caja y funciones transaccionales.
- El encabezado público usa la etiqueta solicitada «Agenda Shankun» y conserva el ancla existente agendaYanKun.
- La landing mantiene Supabase como fuente de verdad para catálogo, precios, categorías, disponibilidad, horarios, configuración y agenda; las consultas y subscripciones Realtime ya existentes actualizan esos datos sin duplicar un catálogo estático.

## Migración pendiente de revisión
La migración se versiona pero no se aplica automáticamente. El sitio público y previews comparten el Supabase actual. Los módulos que dependen de tablas aún no creadas explican el bloqueo y no escriben datos hasta detectar el esquema necesario.

## Verificación en preview
1. Entrar con una cuenta ya registrada como administradora.
2. Confirmar que Catálogo, Pedidos, Horarios y Configuración siguen funcionando.
3. Abrir la carta pública en una pestaña de solo lectura; cambios de catálogo/configuración deben reflejarse desde Supabase.
4. Abrir Clientes y Reportes; validar estados vacíos reales si aún no hay pedidos.
5. Inventario debe informar que la migración sigue pendiente y no debe escribir nada.
6. No enviar pedidos reales ni abrir WhatsApp como parte de pruebas.
7. Después de revisar y aplicar la migración en una ventana controlada, validar inventario/recetas/compras/caja con registros de prueba controlados y eliminables.


## Marketing conectado a la landing
Se agregó la tabla versionada `marketing_campaigns` para novedades informativas, con fechas, estado, prioridad y visibilidad pública. La landing consulta solo campañas publicables vigentes por Supabase y se actualiza por Realtime; sin campañas, la sección queda oculta. Los descuentos del checkout no se aplican desde esta tabla: requieren validación transaccional adicional en servidor.
