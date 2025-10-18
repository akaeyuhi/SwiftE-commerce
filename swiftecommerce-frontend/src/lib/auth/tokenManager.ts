/**
 * Token Management - Store in memory for security
 */
let accessToken: string | null = null;
let refreshToken: string | null = null;

export const getAccessToken = (): string | null => accessToken;

export const setAccessToken = (token: string): void => {
  accessToken = token;
};

export const getRefreshToken = (): string | null => refreshToken;

export const setRefreshToken = (token: string): void => {
  refreshToken = token;
};

export const clearTokens = (): void => {
  accessToken = null;
  refreshToken = null;
};
