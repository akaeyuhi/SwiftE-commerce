import { StateCreator } from 'zustand';
import { AppStore } from '@/app/store';

export type Theme = 'light' | 'dark' | 'system';

export interface UISlice {
  // State
  theme: Theme;
  sidebarOpen: boolean;
  mobileMenuOpen: boolean;
  searchOpen: boolean;

  // Actions
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;
  setMobileMenuOpen: (open: boolean) => void;
  toggleSearch: () => void;
  setSearchOpen: (open: boolean) => void;

  // Computed
  getActualTheme: () => 'light' | 'dark';
}

export const createUISlice: StateCreator<
  AppStore,
  [['zustand/devtools', never]],
  [],
  UISlice
> = (set, get) => ({
  // Initial state
  theme: 'system',
  sidebarOpen: true,
  mobileMenuOpen: false,
  searchOpen: false,

  // Actions
  setTheme: (theme) => set({ theme }, false, 'ui/setTheme'),

  toggleSidebar: () =>
    set(
      (state) => ({ sidebarOpen: !state.sidebarOpen }),
      false,
      'ui/toggleSidebar'
    ),

  setSidebarOpen: (open) =>
    set({ sidebarOpen: open }, false, 'ui/setSidebarOpen'),

  toggleMobileMenu: () =>
    set(
      (state) => ({ mobileMenuOpen: !state.mobileMenuOpen }),
      false,
      'ui/toggleMobileMenu'
    ),

  setMobileMenuOpen: (open) =>
    set({ mobileMenuOpen: open }, false, 'ui/setMobileMenuOpen'),

  toggleSearch: () =>
    set(
      (state) => ({ searchOpen: !state.searchOpen }),
      false,
      'ui/toggleSearch'
    ),

  setSearchOpen: (open) => set({ searchOpen: open }, false, 'ui/setSearchOpen'),

  // Computed
  getActualTheme: () => {
    const theme = get().theme;
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }
    return theme;
  },
});
