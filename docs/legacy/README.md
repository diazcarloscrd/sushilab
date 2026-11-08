# Tablas Heredadas (Snake Case) - Respaldo y Reporte

**Fecha de extracción:** 2026-11-08  
**Motivo:** Saneamiento de esquema (Fase 0 - Auditoría 2). Unificación hacia tablas oficiales PascalCase (`Order`, `Product`, `Customer`, `Category`, etc.).

## Hallazgo de comparación
- Las tablas snake_case (`products`, `categories`, `orders`, `delivery_zones`, `sales_locations`, `business_hours`, etc.) contenían datos preliminares de prueba con categorías genéricas ("Panchos de Sushi", "Burgers de Sushi", "asado", "amigo").
- La plataforma oficial opera 100% sobre las tablas PascalCase (`Product`, `Category`, `DeliveryZone`, `Order`, `Customer`), que contienen el menú oficial de Yankun Sushi Lab para Bahía Blanca.
- Ningún dato productivo de clientes o transacciones se pierde al eliminar las tablas snake_case.
