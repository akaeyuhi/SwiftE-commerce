import { SliceCreator } from '@/app/store/types.ts';

// The cart's data state is now primarily managed by React Query using server state.
// This slice only handles UI state related to the cart, like its visibility.
// Cart data should be fetched using hooks from 'features/cart/hooks/useCart.ts'.

export interface CartSlice {
  // State
  isCartOpen: boolean;

  // Actions
  toggleCart: () => void;
  setCartOpen: (open: boolean) => void;
}

export const createCartSlice: SliceCreator<CartSlice> = (set) => ({
  // Initial state
  isCartOpen: false,

  // Actions
  toggleCart: () =>
    set((state) => ({ isCartOpen: !state.isCartOpen }), false, 'cart/toggle'),

  setCartOpen: (open) => set({ isCartOpen: open }, false, 'cart/setOpen'),
});

