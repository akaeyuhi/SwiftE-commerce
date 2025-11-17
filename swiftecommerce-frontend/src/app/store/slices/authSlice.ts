import { User, SliceCreator } from '../types';

export interface AuthSlice {
  // State
  user: User | null;
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  setRefreshToken: (refreshToken: string | null) => void;
  login: (user: User, token: string, refreshToken?: string) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  clearTokens: () => void;

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
  refreshToken: null,

  // Actions
  setUser: (user) =>
    set({ user, isAuthenticated: !!user }, false, 'auth/setUser'),

  setAccessToken: (token) =>
    set({ accessToken: token }, false, 'auth/setAccessToken'),
  setRefreshToken: (token) =>
    set({ refreshToken: token }, false, 'auth/setRefreshToken'),

  login: (user, token, refreshToken) =>
    set(
      {
        user,
        accessToken: token,
        refreshToken,
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

  clearTokens: () =>
    set({ accessToken: null, refreshToken: null }, false, 'auth/clearTokens'),

  // Computed selectors
  isStoreOwner: () => get().user?.siteRole === 'SITE_ADMIN',
  isAdmin: () => get().user?.siteRole === 'SITE_USER',
  hasStore: () => !!get().user?.ownedStores?.length,
});
