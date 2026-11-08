/**
 * Formateador de Comandas para Ticketera Térmica (ESC/POS)
 * Compatible con impresoras de 58mm y 80mm conectadas por USB, Red (TCP/IP) o Bluetooth.
 */

interface OrderPrintData {
  orderNumber: number;
  customerName: string;
  customerPhone: string;
  address?: string;
  isTakeAway: boolean;
  notes?: string;
  items: Array<{
    name: string;
    quantity: number;
    options?: string[];
  }>;
  total?: number;
  paymentMethod: string;
  createdAt: string;
}

export function generateKitchenTicketText(order: OrderPrintData): string {
  const line = "----------------------------------------\n";
  let ticket = "";
  
  ticket += "\x1B\x61\x01"; // Centrar
  ticket += "\x1B\x21\x30"; // Doble alto + doble ancho
  ticket += `*** COMANDA #${order.orderNumber} ***\n`;
  ticket += "\x1B\x21\x00"; // Normal
  ticket += order.isTakeAway ? ">> RETIRO EN LOCAL <<\n" : ">> ENVIO A DOMICILIO <<\n";
  ticket += `Hora: ${order.createdAt}\n`;
  ticket += line;
  
  ticket += "\x1B\x61\x00"; // Alinear izquierda
  ticket += `Cliente: ${order.customerName}\n`;
  if (order.address) ticket += `Dirección: ${order.address}\n`;
  if (order.notes) ticket += `OBS: ${order.notes}\n`;
  ticket += line;

  ticket += "\x1B\x21\x08"; // Negrita
  ticket += "CANT  PRODUCTO\n";
  ticket += "\x1B\x21\x00";
  ticket += line;

  for (const item of order.items) {
    ticket += `${item.quantity.toString().padEnd(5)} ${item.name}\n`;
    if (item.options && item.options.length > 0) {
      for (const opt of item.options) {
        ticket += `      * ${opt}\n`;
      }
    }
  }

  ticket += line;
  ticket += `Pago: ${order.paymentMethod}\n`;
  ticket += "\x1D\x56\x41\x10"; // Cortar papel (Feed & Cut)
  return ticket;
}
