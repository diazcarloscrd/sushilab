/**
 * Formateador de Comandas para Ticketera Térmica (ESC/POS)
 * Diseñado para Bahía Blanca y compatible con impresoras de 58mm y 80mm (USB, Red o Bluetooth).
 * Utiliza Codepage CP858 / Latin-1 para evitar caracteres mojibake.
 */

export interface OrderPrintData {
  orderNumber: number;
  customerName: string;
  customerPhone: string;
  address?: string;
  isTakeAway: boolean;
  notes?: string;
  courierName?: string;
  allergies?: string;
  items: Array<{
    name: string;
    quantity: number;
    baseRice?: string;
    options?: string[];
    price?: number;
  }>;
  subtotal?: number;
  discount?: number;
  deliveryFee?: number;
  total?: number;
  paymentMethod: string;
  paymentStatus?: string;
  cashAmountPaid?: number | null;
  cashChange?: number | null;
  createdAt: string;
}

// Inicialización de página de códigos CP858 (Europa Occidental con símbolo Euro)
const ESC_INIT = '\x1B\x40'; // Initialize printer
const ESC_CODEPAGE_CP858 = '\x1B\x74\x13'; // Select CP858
const ESC_ALIGN_CENTER = '\x1B\x61\x01';
const ESC_ALIGN_LEFT = '\x1B\x61\x00';
const ESC_DOUBLE_SIZE = '\x1B\x21\x30';
const ESC_BOLD_ON = '\x1B\x21\x08';
const ESC_NORMAL = '\x1B\x21\x00';
const ESC_CUT_PAPER = '\x1D\x56\x41\x10'; // Partial cut with feed

/**
 * 1. Ticket de Elaboración para Cocina KDS
 */
export function generateKitchenTicketText(order: OrderPrintData): string {
  const line = '----------------------------------------\n';
  let ticket = '';

  ticket += ESC_INIT + ESC_CODEPAGE_CP858;
  ticket += ESC_ALIGN_CENTER + ESC_DOUBLE_SIZE;
  ticket += `*** COMANDA #${order.orderNumber} ***\n`;
  ticket += ESC_NORMAL;
  ticket += order.isTakeAway ? '>> RETIRO EN LOCAL (Alsina 350) <<\n' : '>> DELIVERY BAHIA BLANCA <<\n';
  ticket += `Hora: ${new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\n`;
  ticket += line;

  ticket += ESC_ALIGN_LEFT;
  ticket += `Cliente: ${order.customerName}\n`;
  if (order.allergies) {
    ticket += ESC_BOLD_ON;
    ticket += `ALERTA ALERGIA: ${order.allergies}\n`;
    ticket += ESC_NORMAL;
  }
  if (order.notes) {
    ticket += ESC_BOLD_ON;
    ticket += `OBS: ${order.notes}\n`;
    ticket += ESC_NORMAL;
  }
  ticket += line;

  ticket += ESC_BOLD_ON + 'CANT  PIEZA / ROLL\n' + ESC_NORMAL;
  ticket += line;

  for (const item of order.items) {
    ticket += `${item.quantity.toString().padEnd(5)} ${item.name}\n`;
    if (item.baseRice) {
      ticket += `      - Arroz: ${item.baseRice}\n`;
    }
    if (item.options && item.options.length > 0) {
      for (const opt of item.options) {
        ticket += `      - ${opt}\n`;
      }
    }
  }

  ticket += line;
  ticket += `Pago: ${order.paymentMethod} (${order.paymentStatus || 'PENDIENTE'})\n`;
  ticket += '\n\n\n' + ESC_CUT_PAPER;

  return ticket;
}

/**
 * 2. Ticket de Despacho / Cadetería (Repartidor)
 */
export function generateDispatchTicketText(order: OrderPrintData): string {
  const line = '========================================\n';
  let ticket = '';

  ticket += ESC_INIT + ESC_CODEPAGE_CP858;
  ticket += ESC_ALIGN_CENTER + ESC_DOUBLE_SIZE;
  ticket += `TICKET DESPACHO #${order.orderNumber}\n`;
  ticket += ESC_NORMAL;
  ticket += 'YANKUN SUSHI LAB — BAHIA BLANCA\n';
  ticket += `Fecha: ${new Date(order.createdAt).toLocaleString()}\n`;
  ticket += line;

  ticket += ESC_ALIGN_LEFT;
  ticket += `Destinatario: ${order.customerName}\n`;
  ticket += `Teléfono: ${order.customerPhone}\n`;
  ticket += `Dirección: ${order.address || 'Alsina 350 (Retiro en Local)'}\n`;
  if (order.courierName) {
    ticket += `Cadete Asignado: ${order.courierName}\n`;
  }
  ticket += line;

  ticket += ESC_BOLD_ON + 'RESUMEN DE CUENTA:\n' + ESC_NORMAL;
  if (order.subtotal) ticket += `Subtotal:      $${order.subtotal.toLocaleString('es-AR')}\n`;
  if (order.discount && order.discount > 0) ticket += `Descuento:    -$${order.discount.toLocaleString('es-AR')}\n`;
  if (order.deliveryFee && order.deliveryFee > 0) ticket += `Envío flete:   $${order.deliveryFee.toLocaleString('es-AR')}\n`;
  ticket += ESC_BOLD_ON;
  ticket += `TOTAL A COBRAR: $${(order.total || 0).toLocaleString('es-AR')}\n`;
  ticket += ESC_NORMAL;

  ticket += `Medio de Pago: ${order.paymentMethod}\n`;
  if (order.paymentMethod === 'EFECTIVO' && order.cashAmountPaid) {
    ticket += `Paga con:      $${order.cashAmountPaid.toLocaleString('es-AR')}\n`;
    ticket += `VUELTO:        $${(order.cashChange || 0).toLocaleString('es-AR')}\n`;
  }

  ticket += line;
  ticket += ESC_ALIGN_CENTER;
  ticket += '¡Muchas gracias por elegir Yankun!\n';
  ticket += '\n\n\n' + ESC_CUT_PAPER;

  return ticket;
}
