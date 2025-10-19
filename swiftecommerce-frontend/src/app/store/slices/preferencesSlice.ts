import { StateCreator } from 'zustand';
import { AppStore } from '@/app/store';

export interface PreferencesSlice {
  // State
  language: string;
  currency: string;
  itemsPerPage: number;
  defaultView: 'grid' | 'list';

  // Actions
  setLanguage: (language: string) => void;
  setCurrency: (currency: string) => void;
  setItemsPerPage: (items: number) => void;
  setDefaultView: (view: 'grid' | 'list') => void;
}

export const createPreferencesSlice: StateCreator<
  AppStore,
  [['zustand/devtools', never]],
  [],
  PreferencesSlice
> = (set) => ({
  // Initial state
  language: 'en',
  currency: 'USD',
  itemsPerPage: 20,
  defaultView: 'grid',

  // Actions
  setLanguage: (language) =>
    set({ language }, false, 'preferences/setLanguage'),

  setCurrency: (currency) =>
    set({ currency }, false, 'preferences/setCurrency'),

  setItemsPerPage: (items) =>
    set({ itemsPerPage: items }, false, 'preferences/setItemsPerPage'),

  setDefaultView: (view) =>
    set({ defaultView: view }, false, 'preferences/setDefaultView'),
});
