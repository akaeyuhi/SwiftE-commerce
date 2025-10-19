import { StateCreator } from 'zustand';
import { AppStore } from '@/app/store';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'customer' | 'store_owner' | 'admin';
  storeId?: string;
}

export interface AuthSlice {
  // State
  user: User | null;
  isAuthenticated: boolean;
  accessToken: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  login: (user: User, token: string) => void;
  logout: () => void;

  // Selectors
  isStoreOwner: () => boolean;
  isAdmin: () => boolean;
}

export const createAuthSlice: StateCreator<
  AppStore,
  [['zustand/devtools', never]],
  [],
  AuthSlice
> = (set, get) => ({
  // Initial state
  user: null,
  isAuthenticated: false,
  accessToken: null,

  // Actions
  setUser: (user) =>
    set({ user, isAuthenticated: !!user }, false, 'auth/setUser'),

  setAccessToken: (token) =>
    set({ accessToken: token }, false, 'auth/setAccessToken'),

  login: (user, token) =>
    set(
      {
        user,
        accessToken: token,
        isAuthenticated: true,
      },
      false,
      'auth/login'
    ),

  logout: () =>
    set(
      {
        user: null,
        accessToken: null,
        isAuthenticated: false,
      },
      false,
      'auth/logout'
    ),

  // Selectors
  isStoreOwner: () => get().user?.role === 'store_owner',
  isAdmin: () => get().user?.role === 'admin',
});
