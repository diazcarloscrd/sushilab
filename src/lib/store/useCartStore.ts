import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface CartModifierExtra {
  id: string;
  name: string;
  price: number;
}

export interface CartItem {
  cartItemId: string; // Hash único basado en id + modificadores
  productId: string;
  name: string;
  price: number;
  basePrice: number;
  image: string;
  quantity: number;
  baseRice?: string;
  sauces: string[];
  extras: CartModifierExtra[];
  notes?: string;
}

export interface CustomerData {
  name: string;
  phone: string;
  address: string;
  notes?: string;
  lat?: number;
  lng?: number;
}

interface CartStore {
  items: CartItem[];
  deliveryType: 'DELIVERY' | 'TAKE_AWAY';
  deliveryFee: number;
  deliveryZoneId: string | null;
  deliveryZoneName: string | null;
  appliedCoupon: string | null;
  couponDiscountPercent: number;
  customer: CustomerData;
  scheduledFor: string | null;
  cashAmountPaid: number | null;
  
  // Actions
  addItem: (item: Omit<CartItem, 'cartItemId'>) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, delta: number) => void;
  clearCart: () => void;
  setDeliveryType: (type: 'DELIVERY' | 'TAKE_AWAY') => void;
  setDeliveryZone: (zoneId: string | null, zoneName: string | null, fee: number) => void;
  setCouponDiscount: (code: string | null, percent: number) => void;
  removeCoupon: () => void;
  setCustomer: (customer: Partial<CustomerData>) => void;
  setScheduledFor: (isoDate: string | null) => void;
  setCashAmountPaid: (amount: number | null) => void;
  
  // Computed getters
  getItemsCount: () => number;
  getSubtotal: () => number;
  getDiscount: () => number;
  getTotal: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      deliveryType: 'DELIVERY',
      deliveryFee: 1200,
      deliveryZoneId: 'zone_palermo',
      deliveryZoneName: 'Zona 1: Centro & Macrocentro',
      appliedCoupon: null,
      couponDiscountPercent: 0,
      scheduledFor: null,
      cashAmountPaid: null,
      customer: {
        name: '',
        phone: '',
        address: 'Alsina 350, Centro, Bahía Blanca',
        notes: '',
        lat: -38.7183,
        lng: -62.2663,
      },

      addItem: (newItem) => {
        const modifierKey = `${newItem.baseRice || ''}-${newItem.sauces.sort().join(',')}-${newItem.extras.map(e => e.id).sort().join(',')}-${newItem.notes || ''}`;
        const cartItemId = `${newItem.productId}-${modifierKey}`;

        const currentItems = get().items;
        const existingIndex = currentItems.findIndex(i => i.cartItemId === cartItemId);

        if (existingIndex > -1) {
          const updated = [...currentItems];
          updated[existingIndex].quantity += newItem.quantity;
          set({ items: updated });
        } else {
          set({ items: [...currentItems, { ...newItem, cartItemId }] });
        }
      },

      removeItem: (cartItemId) => {
        set({ items: get().items.filter(i => i.cartItemId !== cartItemId) });
      },

      updateQuantity: (cartItemId, delta) => {
        const currentItems = get().items;
        const target = currentItems.find(i => i.cartItemId === cartItemId);
        if (!target) return;

        const newQty = target.quantity + delta;
        if (newQty <= 0) {
          set({ items: currentItems.filter(i => i.cartItemId !== cartItemId) });
        } else {
          set({
            items: currentItems.map(i =>
              i.cartItemId === cartItemId ? { ...i, quantity: newQty } : i
            ),
          });
        }
      },

      clearCart: () => {
        set({ items: [], appliedCoupon: null, couponDiscountPercent: 0, cashAmountPaid: null, scheduledFor: null });
      },

      setDeliveryType: (type) => {
        set({ deliveryType: type });
      },

      setDeliveryZone: (zoneId, zoneName, fee) => {
        set({
          deliveryZoneId: zoneId,
          deliveryZoneName: zoneName,
          deliveryFee: fee,
        });
      },

      setCouponDiscount: (code, percent) => {
        set({ appliedCoupon: code, couponDiscountPercent: percent });
      },

      removeCoupon: () => {
        set({ appliedCoupon: null, couponDiscountPercent: 0 });
      },

      setCustomer: (newCustomerData) => {
        set({
          customer: {
            ...get().customer,
            ...newCustomerData,
          },
        });
      },

      setScheduledFor: (isoDate) => {
        set({ scheduledFor: isoDate });
      },

      setCashAmountPaid: (amount) => {
        set({ cashAmountPaid: amount });
      },

      getItemsCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },

      getSubtotal: () => {
        return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      },

      getDiscount: () => {
        const subtotal = get().getSubtotal();
        let discount = 0;

        // Take Away 15% discount
        if (get().deliveryType === 'TAKE_AWAY') {
          discount += Math.round(subtotal * 0.15);
        } else if (get().couponDiscountPercent > 0) {
          discount += Math.round(subtotal * (get().couponDiscountPercent / 100));
        }

        return discount;
      },

      getTotal: () => {
        const subtotal = get().getSubtotal();
        const discount = get().getDiscount();
        const fee = get().deliveryType === 'DELIVERY' ? get().deliveryFee : 0;
        return Math.max(0, subtotal - discount + fee);
      },
    }),
    {
      name: 'yankun-cart-storage-bbla-v1',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
