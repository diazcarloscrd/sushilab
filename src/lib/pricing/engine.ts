export interface CartItemForPricing {
  productId: string;
  categoryId?: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

export interface PricingRuleCondition {
  id: string;
  name: string;
  active: boolean;
  priority: number;
  stackable: boolean;
  kind: 'PERCENT_ORDER' | 'AMOUNT_ORDER' | 'BUY_X_GET_Y' | 'FREE_SHIPPING' | 'PERCENT_ITEMS';
  validFrom?: string | Date | null;
  validTo?: string | Date | null;
  daysOfWeek?: number[];
  startTime?: string | null; // 'HH:mm'
  endTime?: string | null;
  minSubtotal?: number | null;
  paymentMethods?: string[];
  deliveryTypes?: string[];
  productIds?: string[];
  categoryIds?: string[];
  segments?: string[];
  tiers?: string[];
  firstOrderOnly?: boolean;
  percent?: number | null;
  amount?: number | null;
  buyQty?: number | null;
  getQty?: number | null;
  maxDiscount?: number | null;
}

export interface PricingContext {
  currentTime?: Date;
  deliveryType: 'DELIVERY' | 'TAKE_AWAY';
  paymentMethod: string;
  deliveryFee: number;
  customer?: {
    segment?: string;
    tier?: string;
    isFirstOrder?: boolean;
  } | null;
  coupon?: {
    code: string;
    discountPercent: number;
    discountAmount: number;
    minOrder: number;
  } | null;
}

export interface AppliedDiscount {
  source: 'RULE' | 'COUPON' | 'POINTS';
  id: string;
  label: string;
  amount: number;
}

export interface PricingEngineResult {
  subtotal: number;
  deliveryFee: number;
  discounts: AppliedDiscount[];
  discountTotal: number;
  total: number;
}

export function evaluatePricingRules(
  cart: CartItemForPricing[],
  rules: PricingRuleCondition[],
  context: PricingContext
): PricingEngineResult {
  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const now = context.currentTime || new Date();

  // Fecha y hora en Argentina (Buenos Aires)
  const nowArStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  }).format(now);

  const dayOfWeekAr = new Date(
    now.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' })
  ).getDay();

  const eligibleCandidates: Array<{ rule: PricingRuleCondition; discountAmount: number }> = [];

  for (const rule of rules) {
    if (!rule.active) continue;

    // Validación de fecha de vigencia
    if (rule.validFrom && new Date(rule.validFrom) > now) continue;
    if (rule.validTo && new Date(rule.validTo) < now) continue;

    // Día de la semana
    if (rule.daysOfWeek && rule.daysOfWeek.length > 0 && !rule.daysOfWeek.includes(dayOfWeekAr)) {
      continue;
    }

    // Franja horaria (ej. '19:30' a '21:00')
    if (rule.startTime && rule.endTime) {
      if (rule.startTime <= rule.endTime) {
        if (nowArStr < rule.startTime || nowArStr > rule.endTime) continue;
      } else {
        // Cruza medianoche (ej. '22:00' a '02:00')
        if (nowArStr < rule.startTime && nowArStr > rule.endTime) continue;
      }
    }

    // Subtotal mínimo
    if (rule.minSubtotal && subtotal < rule.minSubtotal) continue;

    // Medio de pago
    if (rule.paymentMethods && rule.paymentMethods.length > 0 && !rule.paymentMethods.includes(context.paymentMethod)) {
      continue;
    }

    // Tipo de entrega
    if (rule.deliveryTypes && rule.deliveryTypes.length > 0 && !rule.deliveryTypes.includes(context.deliveryType)) {
      continue;
    }

    // Segmento de cliente
    if (rule.segments && rule.segments.length > 0 && (!context.customer?.segment || !rule.segments.includes(context.customer.segment))) {
      continue;
    }

    // Nivel de fidelidad
    if (rule.tiers && rule.tiers.length > 0 && (!context.customer?.tier || !rule.tiers.includes(context.customer.tier))) {
      continue;
    }

    // Solo primer pedido
    if (rule.firstOrderOnly && !context.customer?.isFirstOrder) {
      continue;
    }

    // Calcular monto del descuento
    let discountAmount = 0;

    if (rule.kind === 'PERCENT_ORDER' && rule.percent) {
      discountAmount = Math.round(subtotal * (rule.percent / 100));
    } else if (rule.kind === 'AMOUNT_ORDER' && rule.amount) {
      discountAmount = Math.min(subtotal, rule.amount);
    } else if (rule.kind === 'FREE_SHIPPING') {
      discountAmount = context.deliveryFee;
    } else if (rule.kind === 'PERCENT_ITEMS' && rule.percent) {
      const eligibleItemsTotal = cart
        .filter(
          (item) =>
            (!rule.productIds?.length || rule.productIds.includes(item.productId)) &&
            (!rule.categoryIds?.length || (item.categoryId && rule.categoryIds.includes(item.categoryId)))
        )
        .reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

      discountAmount = Math.round(eligibleItemsTotal * (rule.percent / 100));
    } else if (rule.kind === 'BUY_X_GET_Y' && rule.buyQty && rule.getQty) {
      // 2x1 o NxM: se bonifican las unidades más baratas
      const eligibleItems = cart.filter(
        (item) =>
          (!rule.productIds?.length || rule.productIds.includes(item.productId)) &&
          (!rule.categoryIds?.length || (item.categoryId && rule.categoryIds.includes(item.categoryId)))
      );

      const expandedUnits: number[] = [];
      eligibleItems.forEach((item) => {
        for (let i = 0; i < item.quantity; i++) expandedUnits.push(item.unitPrice);
      });

      expandedUnits.sort((a, b) => a - b); // De menor a mayor precio
      const groupSize = rule.buyQty + rule.getQty;
      const groupsCount = Math.floor(expandedUnits.length / groupSize);
      const unitsToFree = groupsCount * rule.getQty;

      discountAmount = expandedUnits.slice(0, unitsToFree).reduce((sum, p) => sum + p, 0);
    }

    if (rule.maxDiscount && discountAmount > rule.maxDiscount) {
      discountAmount = rule.maxDiscount;
    }

    if (discountAmount > 0) {
      eligibleCandidates.push({ rule, discountAmount });
    }
  }

  // Selección de descuentos (no acumulables: el de mayor beneficio gana; acumulables: se suman)
  const appliedDiscounts: AppliedDiscount[] = [];

  const nonStackable = eligibleCandidates.filter((c) => !c.rule.stackable);
  const stackable = eligibleCandidates.filter((c) => c.rule.stackable);

  if (nonStackable.length > 0) {
    nonStackable.sort((a, b) => {
      if (b.discountAmount !== a.discountAmount) return b.discountAmount - a.discountAmount;
      return b.rule.priority - a.rule.priority;
    });

    const best = nonStackable[0];
    appliedDiscounts.push({
      source: 'RULE',
      id: best.rule.id,
      label: best.rule.name,
      amount: best.discountAmount,
    });
  }

  for (const st of stackable) {
    appliedDiscounts.push({
      source: 'RULE',
      id: st.rule.id,
      label: st.rule.name,
      amount: st.discountAmount,
    });
  }

  // Cupón si existe y aplica
  if (context.coupon && subtotal >= (context.coupon.minOrder || 0)) {
    let cpAmount = 0;
    if (context.coupon.discountPercent > 0) {
      cpAmount = Math.round(subtotal * (context.coupon.discountPercent / 100));
    } else if (context.coupon.discountAmount > 0) {
      cpAmount = Math.min(subtotal, context.coupon.discountAmount);
    }

    if (cpAmount > 0) {
      // Si el cupón ofrece mayor descuento que los no acumulables o no hay conflicto
      appliedDiscounts.push({
        source: 'COUPON',
        id: context.coupon.code,
        label: `Cupón ${context.coupon.code}`,
        amount: cpAmount,
      });
    }
  }

  const rawDiscountTotal = appliedDiscounts.reduce((sum, d) => sum + d.amount, 0);
  const discountTotal = Math.min(subtotal + context.deliveryFee, rawDiscountTotal);
  const total = Math.max(0, subtotal + context.deliveryFee - discountTotal);

  return {
    subtotal,
    deliveryFee: context.deliveryFee,
    discounts: appliedDiscounts,
    discountTotal,
    total,
  };
}
