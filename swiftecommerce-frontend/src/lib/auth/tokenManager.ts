/**
 * Token Management - Using Zustand Store
 */
import { useStore } from '@/app/store';

export const getAccessToken = (): string | null =>
  useStore.getState().accessToken || null;

export const setAccessToken = (token: string): void => {
  useStore.getState().setAccessToken(token);
};

export const getRefreshToken = (): string | null =>
  useStore.getState().refreshToken;

export const setRefreshToken = (token: string): void => {
  useStore.getState().setRefreshToken?.(token);
};

export const clearTokens = (): void => {
  useStore.getState().clearTokens();
};
