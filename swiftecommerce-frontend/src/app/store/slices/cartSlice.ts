import { SliceCreator } from '@/app/store/types.ts';

export interface CartItem {
  id: string;
  productId: string;
  variantId: string;
  productName: string;
  variantSku: string;
  price: number;
  quantity: number;
  maxQuantity: number;
  attributes?: Record<string, string>;
  imageUrl?: string;
  storeId: string;
  storeName: string;
}

export interface CartSlice {
  // State
  items: CartItem[];
  isCartOpen: boolean;

  // Actions
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  clearStoreCart: (storeId: string) => void;
  toggleCart: () => void;
  setCartOpen: (open: boolean) => void;

  // Computed
  getTotalItems: () => number;
  getTotalPrice: () => number;
  getStoreItems: (storeId: string) => CartItem[];
  getStores: () => Array<{ id: string; name: string; items: CartItem[] }>;
}

export const createCartSlice: SliceCreator<CartSlice> = (set, get) => ({
  // Initial state
  items: [],
  isCartOpen: false,

  // Actions
  addItem: (item) => {
    const existingItem = get().items.find(
      (i) => i.variantId === item.variantId && i.storeId === item.storeId
    );

    if (existingItem) {
      // Update quantity if item exists
      const newQuantity = Math.min(
        existingItem.quantity + item.quantity,
        existingItem.maxQuantity
      );
      set(
        (state) => ({
          items: state.items.map((i) =>
            i.id === existingItem.id ? { ...i, quantity: newQuantity } : i
          ),
        }),
        false,
        'cart/addItem/update'
      );
    } else {
      // Add new item
      const newItem: CartItem = {
        ...item,
        id: `${item.variantId}-${Date.now()}`,
      };
      set(
        (state) => ({ items: [...state.items, newItem] }),
        false,
        'cart/addItem/new'
      );
    }
  },

  removeItem: (itemId) =>
    set(
      (state) => ({ items: state.items.filter((i) => i.id !== itemId) }),
      false,
      'cart/removeItem'
    ),

  updateQuantity: (itemId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(itemId);
      return;
    }

    set(
      (state) => ({
        items: state.items.map((i) =>
          i.id === itemId
            ? { ...i, quantity: Math.min(quantity, i.maxQuantity) }
            : i
        ),
      }),
      false,
      'cart/updateQuantity'
    );
  },

  clearCart: () => set({ items: [] }, false, 'cart/clearCart'),

  clearStoreCart: (storeId) =>
    set(
      (state) => ({ items: state.items.filter((i) => i.storeId !== storeId) }),
      false,
      'cart/clearStoreCart'
    ),

  toggleCart: () =>
    set((state) => ({ isCartOpen: !state.isCartOpen }), false, 'cart/toggle'),

  setCartOpen: (open) => set({ isCartOpen: open }, false, 'cart/setOpen'),

  // Computed
  getTotalItems: () =>
    get().items.reduce((sum, item) => sum + item.quantity, 0),

  getTotalPrice: () =>
    get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),

  getStoreItems: (storeId) =>
    get().items.filter((item) => item.storeId === storeId),

  getStores: () => {
    const items = get().items;
    const storeMap = new Map<
      string,
      { id: string; name: string; items: CartItem[] }
    >();

    items.forEach((item) => {
      if (!storeMap.has(item.storeId)) {
        storeMap.set(item.storeId, {
          id: item.storeId,
          name: item.storeName,
          items: [],
        });
      }
      storeMap.get(item.storeId)!.items.push(item);
    });

    return Array.from(storeMap.values());
  },
});
