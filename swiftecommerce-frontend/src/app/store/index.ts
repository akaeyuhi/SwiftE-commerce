import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import { createAuthSlice, AuthSlice } from './slices/authSlice';
import { createUISlice, UISlice } from './slices/uiSlice';
import { createCartSlice, CartSlice } from './slices/cartSlice';
import {
  createPreferencesSlice,
  PreferencesSlice,
} from './slices/preferencesSlice';
import {
  createWishlistSlice,
  WishlistSlice,
} from '@/app/store/slices/wishlistSlice.ts';

/**
 * Combined store type
 */
export type AppStore = AuthSlice &
  UISlice &
  CartSlice &
  PreferencesSlice &
  WishlistSlice;

/**
 * Main application store
 */
export const useStore = create<AppStore>()(
  devtools(
    persist(
      (set, get, api) => ({
        ...createAuthSlice(set, get, api),
        ...createUISlice(set, get, api),
        ...createCartSlice(set, get, api),
        ...createPreferencesSlice(set, get, api),
        ...createWishlistSlice(set, get, api),
      }),
      {
        name: 'swiftecommerce-storage',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
          accessToken: state.accessToken,
          theme: state.theme,
          actualTheme: state.actualTheme,
          sidebarOpen: state.sidebarOpen,
          language: state.language,
          currency: state.currency,
          itemsPerPage: state.itemsPerPage,
          defaultView: state.defaultView,
          notificationsEnabled: state.notificationsEnabled,
          soundEnabled: state.soundEnabled,
        }),
        version: 1,
      }
    ),
    { name: 'AppStore', enabled: import.meta.env.DEV }
  )
);

if (typeof window !== 'undefined') {
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', (e) => {
      const state = useStore.getState();
      if (state.theme === 'system') {
        const actualTheme = e.matches ? 'dark' : 'light';
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(actualTheme);
        useStore.setState({ actualTheme });
      }
    });
}

// Selector hooks
export const useAuth = () =>
  useStore((state) => ({
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    accessToken: state.accessToken,
    login: state.login,
    logout: state.logout,
    updateUser: state.updateUser,
    isStoreOwner: state.isStoreOwner,
    isAdmin: state.isAdmin,
  }));

export const useUI = () =>
  useStore((state) => ({
    theme: state.theme,
    actualTheme: state.actualTheme,
    sidebarOpen: state.sidebarOpen,
    mobileMenuOpen: state.mobileMenuOpen,
    searchOpen: state.searchOpen,
    setTheme: state.setTheme,
    toggleTheme: state.toggleTheme,
    toggleSidebar: state.toggleSidebar,
    setSidebarOpen: state.setSidebarOpen,
    toggleMobileMenu: state.toggleMobileMenu,
    closeAll: state.closeAll,
    getActualTheme: state.getActualTheme,
  }));

export const useCart = () =>
  useStore((state) => ({
    items: state.items,
    isCartOpen: state.isCartOpen,
    addItem: state.addItem,
    removeItem: state.removeItem,
    updateQuantity: state.updateQuantity,
    clearCart: state.clearCart,
    clearStoreCart: state.clearStoreCart,
    toggleCart: state.toggleCart,
    setCartOpen: state.setCartOpen,
    getTotalItems: state.getTotalItems,
    getTotalPrice: state.getTotalPrice,
    getStoreItems: state.getStoreItems,
    getStores: state.getStores,
  }));

export const usePreferences = () =>
  useStore((state) => ({
    language: state.language,
    currency: state.currency,
    itemsPerPage: state.itemsPerPage,
    defaultView: state.defaultView,
    setLanguage: state.setLanguage,
    setCurrency: state.setCurrency,
    setDefaultView: state.setDefaultView,
  }));

export const useWishlist = () =>
  useStore((state) => ({
    likedProductIds: state.likedProductIds,
    followedStoreIds: state.followedStoreIds,
    setInitialState: state.setInitialState,
    addToWishlist: state.addToWishlist,
    removeFromWishlist: state.removeFromWishlist,
    isInWishlist: state.isInWishlist,
    clearWishlist: state.clearWishlist,
    followStore: state.followStore,
    unfollowStore: state.unfollowStore,
    isFollowingStore: state.isFollowingStore,
    getWishlistCount: state.getWishlistCount,
    getFollowedStoresCount: state.getFollowedStoresCount,
  }));
