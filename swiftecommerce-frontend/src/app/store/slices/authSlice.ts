import { User, SliceCreator } from '../types';

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
  updateUser: (updates: Partial<User>) => void;

  // Computed selectors
  isStoreOwner: () => boolean;
  isAdmin: () => boolean;
  hasStore: () => boolean;
}

export const createAuthSlice: SliceCreator<AuthSlice> = (set, get) => ({
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

  updateUser: (updates) =>
    set(
      (state) => ({
        user: state.user ? { ...state.user, ...updates } : null,
      }),
      false,
      'auth/updateUser'
    ),

  // Computed selectors
  isStoreOwner: () => get().user?.siteRole === 'SITE_ADMIN',
  isAdmin: () => get().user?.siteRole === 'SITE_USER',
  hasStore: () => !!get().user?.ownedStores?.length,
});
