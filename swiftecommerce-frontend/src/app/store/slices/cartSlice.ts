import { CartItem, SliceCreator } from '../types';

export interface CartSlice {
  // State
  items: CartItem[];
  lastUpdated: number | null;

  // Actions
  addItem: (item: CartItem) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  clearCart: () => void;
  setCart: (items: CartItem[]) => void;

  // Computed
  getTotal: () => number;
  getItemCount: () => number;
  getTotalItems: () => number;
  hasItem: (variantId: string) => boolean;
  getItem: (variantId: string) => CartItem | undefined;
}

export const createCartSlice: SliceCreator<CartSlice> = (set, get) => ({
  // Initial state
  items: [],
  lastUpdated: null,

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
            lastUpdated: Date.now(),
          };
        }

        return {
          items: [...state.items, item],
          lastUpdated: Date.now(),
        };
      },
      false,
      'cart/addItem'
    ),

  removeItem: (variantId) =>
    set(
      (state) => ({
        items: state.items.filter((i) => i.variantId !== variantId),
        lastUpdated: Date.now(),
      }),
      false,
      'cart/removeItem'
    ),

  updateQuantity: (variantId, quantity) =>
    set(
      (state) => {
        if (quantity <= 0) {
          return {
            items: state.items.filter((i) => i.variantId !== variantId),
            lastUpdated: Date.now(),
          };
        }

        return {
          items: state.items.map((i) =>
            i.variantId === variantId ? { ...i, quantity } : i
          ),
          lastUpdated: Date.now(),
        };
      },
      false,
      'cart/updateQuantity'
    ),

  clearCart: () =>
    set({ items: [], lastUpdated: Date.now() }, false, 'cart/clearCart'),

  setCart: (items) =>
    set({ items, lastUpdated: Date.now() }, false, 'cart/setCart'),

  // Computed
  getTotal: () =>
    get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),

  getItemCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),

  getTotalItems: () => get().items.length,

  hasItem: (variantId) => get().items.some((i) => i.variantId === variantId),

  getItem: (variantId) => get().items.find((i) => i.variantId === variantId),
});
