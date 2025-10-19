import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { devtools } from 'zustand/middleware';
import { createAuthSlice, AuthSlice } from './slices/authSlice';
import { createUISlice, UISlice } from './slices/uiSlice';
import { createCartSlice, CartSlice } from './slices/cartSlice';
import {
  createPreferencesSlice,
  PreferencesSlice,
} from './slices/preferencesSlice.ts';

// Combine all slices
export type AppStore = AuthSlice & UISlice & CartSlice & PreferencesSlice;

export const useStore = create<AppStore>()(
  devtools(
    persist(
      (...a) => ({
        ...createAuthSlice(...a),
        ...createUISlice(...a),
        ...createCartSlice(...a),
        ...createPreferencesSlice(...a),
      }),
      {
        name: 'swiftecommerce-storage',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          // Only persist these
          auth: {
            isAuthenticated: state.isAuthenticated,
            user: state.user,
          },
          preferences: {
            theme: state.theme,
            language: state.language,
            currency: state.currency,
          },
        }),
      }
    ),
    { name: 'AppStore' }
  )
);
