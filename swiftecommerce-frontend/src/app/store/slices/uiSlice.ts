import { Theme, SliceCreator } from '../types';

export interface UISlice {
  // State
  theme: Theme;
  actualTheme: 'light' | 'dark';
  sidebarOpen: boolean;
  mobileMenuOpen: boolean;
  searchOpen: boolean;
  commandMenuOpen: boolean;

  // Actions
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;
  setMobileMenuOpen: (open: boolean) => void;
  toggleSearch: () => void;
  setSearchOpen: (open: boolean) => void;
  toggleCommandMenu: () => void;
  setCommandMenuOpen: (open: boolean) => void;
  closeAll: () => void;

  // Computed
  getActualTheme: () => 'light' | 'dark';
}

const getActualTheme = (theme: Theme): 'light' | 'dark' => {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  return theme;
};

const applyTheme = (theme: Theme): 'light' | 'dark' => {
  const root = window.document.documentElement;
  root.classList.remove('light', 'dark');

  const actualTheme = getActualTheme(theme);
  root.classList.add(actualTheme);

  return actualTheme;
};

export const createUISlice: SliceCreator<UISlice> = (set, get) => ({
  // Initial state
  theme: 'system',
  actualTheme: 'dark',
  sidebarOpen: false,
  mobileMenuOpen: false,
  searchOpen: false,
  commandMenuOpen: false,

  // Actions
  setTheme: (theme) => {
    const actualTheme = applyTheme(theme);
    set({ theme, actualTheme }, false, 'ui/setTheme');
  },

  toggleTheme: () => {
    const currentActual = get().actualTheme;
    const newTheme = currentActual === 'light' ? 'dark' : 'light';
    const actualTheme = applyTheme(newTheme);
    set({ theme: newTheme, actualTheme }, false, 'ui/toggleTheme');
  },

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

  toggleCommandMenu: () =>
    set(
      (state) => ({ commandMenuOpen: !state.commandMenuOpen }),
      false,
      'ui/toggleCommandMenu'
    ),

  setCommandMenuOpen: (open) =>
    set({ commandMenuOpen: open }, false, 'ui/setCommandMenuOpen'),

  closeAll: () =>
    set(
      {
        mobileMenuOpen: false,
        searchOpen: false,
        commandMenuOpen: false,
      },
      false,
      'ui/closeAll'
    ),

  // Computed
  getActualTheme: () => get().actualTheme,
});
