import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { authSlice, type AuthSlice } from './authSlice';
import { cartSlice, type CartSlice } from './cartSlice';

type StoreState = AuthSlice & CartSlice;

export const useStore = create<StoreState>()(
  devtools(
    persist(
      (...a) => ({
        ...authSlice(...a),
        ...cartSlice(...a),
      }),
      {
        name: 'swiftecommerce-storage',
        partialize: (state) => ({
          items: state.items, // Only persist cart
        }),
      }
    ),
    { name: 'SwiftEcommerce Store' }
  )
);
