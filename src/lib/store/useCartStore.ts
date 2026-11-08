import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface CartModifierExtra {
  id: string;
  name: string;
  price: number;
}

export interface CartItem {
  cartItemId: string; // Unique hash based on id + modifiers
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
  
  // Actions
  addItem: (item: Omit<CartItem, 'cartItemId'>) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, delta: number) => void;
  clearCart: () => void;
  setDeliveryType: (type: 'DELIVERY' | 'TAKE_AWAY') => void;
  setDeliveryZone: (zoneId: string | null, zoneName: string | null, fee: number) => void;
  applyCoupon: (code: string) => boolean;
  removeCoupon: () => void;
  setCustomer: (customer: Partial<CustomerData>) => void;
  
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
      deliveryZoneName: 'Palermo Soho',
      appliedCoupon: null,
      couponDiscountPercent: 0,
      customer: {
        name: '',
        phone: '',
        address: 'Honduras 4850, Palermo Soho, CABA',
        notes: '',
        lat: -34.5885,
        lng: -58.4305,
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
        set({ items: [], appliedCoupon: null, couponDiscountPercent: 0 });
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

      applyCoupon: (code) => {
        const clean = code.trim().toUpperCase();
        if (clean === 'KANSO15' || clean === 'YANKUN15') {
          set({ appliedCoupon: clean, couponDiscountPercent: 15 });
          return true;
        }
        return false;
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
      name: 'yankun-cart-storage-v1',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
