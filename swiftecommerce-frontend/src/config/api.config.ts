import { env } from './env';
import { API_TIMEOUT, API_RETRY_COUNT } from '@/shared/utils/constants';

/**
 * API Configuration
 */
export const apiConfig = {
  baseURL: env.VITE_API_URL,
  timeout: API_TIMEOUT,
  retryCount: API_RETRY_COUNT,
  headers: {
    'Content-Type': 'application/json',
  },
} as const;

/**
 * API Endpoints
 */
export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
  },

  // Users
  USERS: {
    PROFILE: '/users/profile',
    UPDATE: '/users/:id',
    STORES: '/users/:id/stores',
  },

  // Products
  PRODUCTS: {
    LIST: '/products',
    DETAIL: '/products/:id',
    CREATE: '/stores/:storeId/products',
    UPDATE: '/stores/:storeId/products/:id',
    DELETE: '/stores/:storeId/products/:id',
    VARIANTS: '/stores/:storeId/products/:productId/variants',
  },

  // Cart
  CART: {
    GET_OR_CREATE: '/stores/:storeId/:userId/cart/get-or-create',
    ADD_ITEM: '/stores/:storeId/:userId/cart/:cartId/items/add',
    UPDATE_ITEM: '/stores/:storeId/:userId/cart/:cartId/items/:itemId',
    REMOVE_ITEM: '/stores/:storeId/:userId/cart/:cartId/items/:itemId',
  },

  // Orders
  ORDERS: {
    LIST: '/stores/:storeId/orders',
    CREATE: '/stores/:storeId/orders/create',
    DETAIL: '/stores/:storeId/orders/:id',
    UPDATE_STATUS: '/stores/:storeId/orders/:id/status',
    CANCEL: '/stores/:storeId/orders/:id/cancel',
  },

  // Analytics
  ANALYTICS: {
    STORE: '/analytics/stores/:storeId',
    CONVERSION: '/analytics/stores/:storeId/conversion',
    TOP_PRODUCTS: '/analytics/stores/:storeId/products/top',
    REVENUE_TRENDS: '/analytics/stores/:storeId/revenue-trends',
  },

  // AI
  AI: {
    GENERATE_NAME: '/ai/generator/names',
    GENERATE_DESCRIPTION: '/ai/generator/description',
    GENERATE_IDEAS: '/ai/generator/ideas',
    PREDICT: '/ai/predictor/predict',
    PREDICT_BATCH: '/ai/predictor/predict/batch',
    TRENDING: '/ai/predictor/stores/:storeId/trending',
  },
} as const;

/**
 * Replace URL parameters
 */
export function buildUrl(
  template: string,
  params: Record<string, string>
): string {
  return Object.entries(params).reduce(
    (url, [key, value]) => url.replace(`:${key}`, value),
    template
  );
}
