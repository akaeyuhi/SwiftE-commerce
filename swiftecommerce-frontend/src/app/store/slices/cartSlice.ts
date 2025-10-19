import { StateCreator } from 'zustand';
import { AppStore } from '@/app/store';

export interface CartItem {
  variantId: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface CartSlice {
  // State
  items: CartItem[];

  // Actions
  addItem: (item: CartItem) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  clearCart: () => void;

  // Computed
  getTotal: () => number;
  getItemCount: () => number;
  hasItem: (variantId: string) => boolean;
}

export const createCartSlice: StateCreator<
  AppStore,
  [['zustand/devtools', never]],
  [],
  CartSlice
> = (set, get) => ({
  // Initial state
  items: [],

  // Actions
  addItem: (item) =>
    set(
      (state) => {
        const existing = state.items.find(
          (i) => i.variantId === item.variantId
        );
        if (existing) {
          return {
            items: state.items.map((i) =>
              i.variantId === item.variantId
                ? { ...i, quantity: i.quantity + item.quantity }
                : i
            ),
          };
        }
        return { items: [...state.items, item] };
      },
      false,
      'cart/addItem'
    ),

  removeItem: (variantId) =>
    set(
      (state) => ({
        items: state.items.filter((i) => i.variantId !== variantId),
      }),
      false,
      'cart/removeItem'
    ),

  updateQuantity: (variantId, quantity) =>
    set(
      (state) => ({
        items: state.items.map((i) =>
          i.variantId === variantId ? { ...i, quantity } : i
        ),
      }),
      false,
      'cart/updateQuantity'
    ),

  clearCart: () => set({ items: [] }, false, 'cart/clearCart'),

  // Computed
  getTotal: () =>
    get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),

  getItemCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),

  hasItem: (variantId) => get().items.some((i) => i.variantId === variantId),
});
