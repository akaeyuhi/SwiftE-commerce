import { Language, Currency, SliceCreator } from '../types';

export interface PreferencesSlice {
  // State
  language: Language;
  currency: Currency;
  itemsPerPage: number;
  defaultView: 'grid' | 'list';
  notificationsEnabled: boolean;
  soundEnabled: boolean;

  // Actions
  setLanguage: (language: Language) => void;
  setCurrency: (currency: Currency) => void;
  setItemsPerPage: (items: number) => void;
  setDefaultView: (view: 'grid' | 'list') => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
  resetPreferences: () => void;
}

const DEFAULT_PREFERENCES = {
  language: 'en' as Language,
  currency: 'USD' as Currency,
  itemsPerPage: 20,
  defaultView: 'grid' as const,
  notificationsEnabled: true,
  soundEnabled: true,
};

export const createPreferencesSlice: SliceCreator<PreferencesSlice> = (
  set
) => ({
  // Initial state
  ...DEFAULT_PREFERENCES,

  // Actions
  setLanguage: (language) =>
    set({ language }, false, 'preferences/setLanguage'),

  setCurrency: (currency) =>
    set({ currency }, false, 'preferences/setCurrency'),

  setItemsPerPage: (items) =>
    set({ itemsPerPage: items }, false, 'preferences/setItemsPerPage'),

  setDefaultView: (view) =>
    set({ defaultView: view }, false, 'preferences/setDefaultView'),

  setNotificationsEnabled: (enabled) =>
    set(
      { notificationsEnabled: enabled },
      false,
      'preferences/setNotificationsEnabled'
    ),

  setSoundEnabled: (enabled) =>
    set({ soundEnabled: enabled }, false, 'preferences/setSoundEnabled'),

  resetPreferences: () => set(DEFAULT_PREFERENCES, false, 'preferences/reset'),
});
