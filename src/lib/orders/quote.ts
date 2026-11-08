export interface QuoteItemInput {
  productId: string;
  quantity: number;
  baseRice?: string | null;
  sauces?: string[] | null;
  extras?: Array<{ id: string; code?: string; name?: string }> | null;
  notes?: string | null;
}

export interface DbProductForQuote {
  id: string;
  name: string;
  price: number;
  stock: number;
  active: boolean;
  autoPaused?: boolean;
}

export interface DbModifierOptionForQuote {
  code: string;
  name: string;
  priceDelta: number;
  active: boolean;
}

export interface QuoteContext {
  deliveryType: 'DELIVERY' | 'TAKE_AWAY';
  deliveryFee: number;
  minOrderZone?: number;
  isWithinDeliveryZone?: boolean;
  coupon?: {
    code: string;
    discountPercent: number;
    discountAmount: number;
    minOrder: number;
    maxUses?: number | null;
    usedCount?: number;
    expiresAt?: string | null;
    active: boolean;
  } | null;
  takeawayDiscountPercent?: number;
}

export interface QuoteResult {
  valid: boolean;
  error?: string;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  validatedItems: Array<{
    productId: string;
    name: string;
    unitPrice: number;
    quantity: number;
    baseRice?: string | null;
    saucesJson: string;
    extrasJson: string;
    notes?: string | null;
  }>;
}

export function calculateOrderQuote(
  items: QuoteItemInput[],
  dbProducts: Map<string, DbProductForQuote>,
  dbModifiers: Map<string, DbModifierOptionForQuote>,
  context: QuoteContext
): QuoteResult {
  if (!items || items.length === 0) {
    return {
      valid: false,
      error: 'La comanda debe contener al menos un producto',
      subtotal: 0,
      deliveryFee: 0,
      discount: 0,
      total: 0,
      validatedItems: [],
    };
  }

  let subtotal = 0;
  const validatedItems: QuoteResult['validatedItems'] = [];

  for (const item of items) {
    const product = dbProducts.get(item.productId);
    if (!product) {
      return {
        valid: false,
        error: `El producto con ID ${item.productId} no existe en el catálogo`,
        subtotal: 0,
        deliveryFee: 0,
        discount: 0,
        total: 0,
        validatedItems: [],
      };
    }

    if (!product.active || product.autoPaused || product.stock <= 0) {
      return {
        valid: false,
        error: `El producto "${product.name}" se encuentra agotado o inactivo`,
        subtotal: 0,
        deliveryFee: 0,
        discount: 0,
        total: 0,
        validatedItems: [],
      };
    }

    const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));
    let unitPrice = Number(product.price) || 0;

    // Calcular modificador de arroz si aplica
    if (item.baseRice) {
      const riceMod = dbModifiers.get(item.baseRice);
      if (riceMod && riceMod.active) {
        unitPrice += Number(riceMod.priceDelta) || 0;
      }
    }

    // Calcular salsas si tienen costo
    const saucesList = Array.isArray(item.sauces) ? item.sauces : [];
    for (const sCode of saucesList) {
      const sauceMod = dbModifiers.get(sCode);
      if (sauceMod && sauceMod.active) {
        unitPrice += Number(sauceMod.priceDelta) || 0;
      }
    }

    // Calcular extras oficiales
    const parsedExtras: Array<{ id: string; name: string; price: number }> = [];
    const extrasList = Array.isArray(item.extras) ? item.extras : [];
    for (const ext of extrasList) {
      const extraCode = ext.code || ext.id;
      const mod = dbModifiers.get(extraCode);
      if (mod && mod.active) {
        const extraDelta = Number(mod.priceDelta) || 0;
        unitPrice += extraDelta;
        parsedExtras.push({
          id: mod.code,
          name: mod.name,
          price: extraDelta,
        });
      }
    }

    subtotal += unitPrice * qty;

    validatedItems.push({
      productId: product.id,
      name: product.name,
      unitPrice,
      quantity: qty,
      baseRice: item.baseRice || null,
      saucesJson: JSON.stringify(saucesList),
      extrasJson: JSON.stringify(parsedExtras),
      notes: item.notes || null,
    });
  }

  // Validar tarifa de envío
  let deliveryFee = 0;
  if (context.deliveryType === 'DELIVERY') {
    if (context.isWithinDeliveryZone === false) {
      return {
        valid: false,
        error: 'FUERA_DE_COBERTURA: La dirección seleccionada está fuera de nuestras zonas de entrega en Bahía Blanca.',
        subtotal,
        deliveryFee: 0,
        discount: 0,
        total: 0,
        validatedItems,
      };
    }

    deliveryFee = Number(context.deliveryFee) || 0;
    const minOrder = Number(context.minOrderZone) || 0;
    if (minOrder > 0 && subtotal < minOrder) {
      return {
        valid: false,
        error: `El pedido mínimo para esta zona de reparto es de $${minOrder.toLocaleString('es-AR')}`,
        subtotal,
        deliveryFee,
        discount: 0,
        total: 0,
        validatedItems,
      };
    }
  }

  // Calcular Descuento
  let discount = 0;
  if (context.deliveryType === 'TAKE_AWAY') {
    const pct = Number(context.takeawayDiscountPercent ?? 15);
    discount = Math.round(subtotal * (pct / 100));
  } else if (context.coupon && context.coupon.active) {
    const cp = context.coupon;
    const isNotExpired = !cp.expiresAt || new Date(cp.expiresAt) >= new Date();
    const hasUses = cp.maxUses == null || (cp.usedCount || 0) < cp.maxUses;

    if (isNotExpired && hasUses && subtotal >= (cp.minOrder || 0)) {
      if (cp.discountPercent > 0) {
        discount = Math.round(subtotal * (cp.discountPercent / 100));
      } else if (cp.discountAmount > 0) {
        discount = Math.min(subtotal, cp.discountAmount);
      }
    }
  }

  const total = Math.max(0, subtotal - discount + deliveryFee);

  return {
    valid: true,
    subtotal,
    deliveryFee,
    discount,
    total,
    validatedItems,
  };
}
