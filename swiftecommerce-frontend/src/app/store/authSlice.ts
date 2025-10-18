import type { StateCreator } from 'zustand';
import { User } from '@/shared/types/common.types';

export interface AuthSlice {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const authSlice: StateCreator<AuthSlice> = (set) => ({
  user: null,
  isAuthenticated: false,

  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
    }),

  logout: () =>
    set({
      user: null,
      isAuthenticated: false,
    }),
});
