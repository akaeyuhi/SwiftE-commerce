import { env } from './env';
import { API_TIMEOUT, API_RETRY_COUNT } from '@/shared/utils/constants';

export const apiConfig = {
  baseURL: env.VITE_API_URL,
  timeout: API_TIMEOUT,
  retryCount: API_RETRY_COUNT,
  headers: {
    'Content-Type': 'application/json',
  },
} as const;

/**
 * API Endpoints - Based on actual Swagger schema
 */
export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
    CONFIRM: '/auth/confirm/:type',
    RESEND_CONFIRMATION: '/auth/resend-confirmation',
    CONFIRMATION_STATUS: '/auth/:userId/confirmation-status',
    ASSIGN_SITE_ADMIN: '/auth/assign-site-admin',
    ASSIGN_STORE_ROLE: '/auth/assign-store-role',
    REVOKE_SITE_ADMIN: '/auth/revoke-site-admin',
    REVOKE_STORE_ROLE: '/auth/revoke-store-role',
    CANCEL_ROLE_ASSIGNMENT: '/auth/cancel-role-assignment',
    RESET_PASSWORD: '/auth/reset-password',
    CHANGE_PASSWORD: '/auth/change-password',
    VERIFY_TOKEN: '/auth/verify-token',
  },

  USERS: {
    LIST: '/users',
    CREATE: '/users',
    FIND_ONE: '/users/:id',
    UPDATE: '/users/:id',
    DELETE: '/users/:id',
    PROFILE: '/users/profile',
    UPDATE_PROFILE: '/users/profile',
    GET_USER_PROFILE: '/users/:id/profile',
    VERIFY_EMAIL: '/users/:id/verify-email',
    IS_EMAIL_VERIFIED: '/users/:id/email-verified',
    HAS_STORE_ROLE: '/users/:id/stores/:storeId/roles/:roleName/check',
    IS_STORE_ADMIN: '/users/:id/stores/:storeId/admin/check',
    GET_STORE_ROLES: '/users/:id/store-roles',
    IS_SITE_ADMIN: '/users/:id/site-admin/check',
    ASSIGN_SITE_ADMIN: '/users/:id/site-admin',
    DEACTIVATE: '/users/:id/deactivate',
    REACTIVATE: '/users/:id/reactivate',
    ASSIGN_ROLE: '/users/:id/roles',
    REVOKE_ROLE: '/users/:id/roles',
    CREATE_STORE: '/users/:id/stores',
    CHECK_STORE_ROLE: '/users/:id/stores/:storeId/roles/:roleName/check',
    REVOKE_STORE_ROLE: '/users/:id/roles',
  },

  // Stores
  STORES: {
    LIST: '/stores',
    CREATE: '/stores',
    FIND_ONE: '/stores/:id',
    UPDATE: '/stores/:id',
    DELETE: '/stores/:id',
    SOFT_DELETE: '/stores/:id/soft',
    SEARCH: '/stores/search',
    ADVANCED_SEARCH: '/stores/advanced-search',
    AUTOCOMPLETE: '/stores/autocomplete',
    STATS: '/stores/:id/stats',
    QUICK_STATS: '/stores/:id/quick-stats',
    TOP_BY_REVENUE: '/stores/top/revenue',
    TOP_BY_PRODUCTS: '/stores/top/products',
    TOP_BY_FOLLOWERS: '/stores/top/followers',
    RECALCULATE_STATS: '/stores/:id/recalculate-stats',
    RECALCULATE_ALL_STATS: '/stores/recalculate-all-stats',
    HEALTH: '/stores/:id/health',
  },

  // Products
  PRODUCTS: {
    LIST: '/stores/:storeId/products',
    LIST_BY_STORE: '/stores/:storeId/products/byStore',
    CREATE: '/stores/:storeId/products',
    FIND_ONE: '/stores/:storeId/products/:id',
    FIND_DETAILED: '/stores/:storeId/products/:id/detailed',
    UPDATE: '/stores/:storeId/products/:id',
    DELETE: '/stores/:storeId/products/:id',
    SOFT_DELETE: '/stores/:storeId/products/:id/soft',
    SEARCH: '/stores/:storeId/products/search',
    ADVANCED_SEARCH: '/stores/:storeId/products/advanced-search',
    AUTOCOMPLETE: '/stores/:storeId/products/autocomplete',
    STATS: '/stores/:storeId/products/:id/stats',
    QUICK_STATS: '/stores/:storeId/products/:id/quick-stats',
    ADD_PHOTOS: '/stores/:storeId/products/:id/photos',
    ADD_MAIN_PHOTO: '/stores/:storeId/products/:id/photos/main',
    DELETE_PHOTO: '/stores/:storeId/products/:productId/photos/:photoId',
    BY_CATEGORY: '/stores/:storeId/products/category/:categoryId',
    ASSIGN_CATEGORY: '/stores/:storeId/products/:id/categories/:categoryId',
    REMOVE_CATEGORY: '/stores/:storeId/products/:id/categories/:categoryId',
    RECALCULATE_STATS: '/stores/:storeId/products/:id/recalculate-stats',
    INCREMENT_VIEW: '/stores/:storeId/products/:id/increment-view',
    // Rankings
    TOP_BY_VIEWS: '/stores/:storeId/products/top/views',
    TOP_BY_SALES: '/stores/:storeId/products/top/sales',
    TOP_RATED: '/stores/:storeId/products/top/rated',
    TOP_BY_CONVERSION: '/stores/:storeId/products/top/conversion',
    TRENDING: '/stores/:storeId/products/trending',
  },

  // Product Variants
  VARIANTS: {
    LIST: '/stores/:storeId/products/:productId/variants',
    CREATE: '/stores/:storeId/products/:productId/variants',
    FIND_ONE: '/stores/:storeId/products/:productId/variants/:id',
    FIND_BY_SKU: '/stores/:storeId/products/:productId/variants/by-sku/:sku',
    UPDATE: '/stores/:storeId/products/:productId/variants/:id',
    DELETE: '/stores/:storeId/products/:productId/variants/:id',
    ADD_ATTRIBUTES:
      '/stores/:storeId/products/:productId/variants/:id/attributes',
    REMOVE_ATTRIBUTE:
      '/stores/:storeId/products/:productId/variants/:id/attributes/:key',
    SET_INVENTORY:
      '/stores/:storeId/products/:productId/variants/:id/inventory',
    ADJUST_INVENTORY:
      '/stores/:storeId/products/:productId/variants/:id/inventory',
    UPDATE_PRICE: '/stores/:storeId/products/:productId/variants/:id/price',
  },

  // Cart
  CART: {
    LIST: '/stores/:storeId/:userId/cart',
    CREATE: '/stores/:storeId/:userId/cart',
    FIND_ONE: '/stores/:storeId/:userId/cart/:id',
    UPDATE: '/stores/:storeId/:userId/cart/:id',
    DELETE: '/stores/:storeId/:userId/cart/:id',
    GET_OR_CREATE: '/stores/:storeId/:userId/cart/get-or-create',
    GET_USER_CART: '/stores/:storeId/:userId/cart/user-cart',
    CLEAR: '/stores/:storeId/:userId/cart/clear',
    REMOVE_CART: '/stores/:storeId/:userId/cart',
    MERGED_CARTS: '/stores/:storeId/:userId/cart/merged',
    ADD_OR_INCREMENT: '/stores/:storeId/:userId/cart/:cartId/add-item',
    SYNC_ITEMS: '/stores/:storeId/:userId/cart/sync',
    ADD_ITEM: '/stores/:storeId/:userId/cart/:cartId/add-item',
    GET_MERGED: '/stores/:storeId/:userId/cart/merged',
  },

  // Cart Items
  CART_ITEMS: {
    LIST: '/stores/:storeId/:userId/cart/:cartId/items',
    CREATE: '/stores/:storeId/:userId/cart/:cartId/items',
    FIND_ONE: '/stores/:storeId/:userId/cart/:cartId/items/:id',
    UPDATE: '/stores/:storeId/:userId/cart/:cartId/items/:id',
    UPDATE_QUANTITY: '/stores/:storeId/:userId/cart/:cartId/items/:itemId',
    DELETE: '/stores/:storeId/:userId/cart/:cartId/items/:id',
    GET_TREE: '/stores/:storeId/categories/tree',
  },

  // Orders
  ORDERS: {
    LIST: '/stores/:storeId/orders',
    LIST_ALL: '/stores/:storeId/orders/all',
    CREATE: '/stores/:storeId/orders',
    CREATE_USER_ORDER: '/stores/:storeId/orders/:userId/create',
    FIND_ONE: '/stores/:storeId/orders/:id',
    DETAIL: '/stores/:storeId/orders/:id',
    UPDATE: '/stores/:storeId/orders/:id',
    DELETE: '/stores/:storeId/orders/:id',
    BY_USER: '/stores/:storeId/orders/user/:userId',
    CHECKOUT: '/stores/:storeId/orders/:id/checkout',
    UPDATE_STATUS: '/stores/:storeId/orders/:id/status',
    CANCEL: '/stores/:storeId/orders/:id/cancel',
    RETURN: '/stores/:storeId/orders/:id/return',
    INVENTORY_IMPACT: '/stores/:storeId/orders/:id/inventory-impact',
    UPDATE_SHIPPING: '/stores/:storeId/orders/:id/shipping',
    MARK_DELIVERED: '/stores/:storeId/orders/:id/delivered',
    FIND_BY_USER: '/stores/:storeId/orders/user/:userId',
  },

  // Categories
  CATEGORIES: {
    LIST: '/stores/:storeId/categories',
    CREATE: '/stores/:storeId/categories',
    FIND_ONE: '/stores/:storeId/categories/:id',
    UPDATE: '/stores/:storeId/categories/:id',
    DELETE: '/stores/:storeId/categories/:id',
    TREE: '/stores/:storeId/categories/tree',
  },

  // Reviews
  REVIEWS: {
    LIST: '/stores/:storeId/products/:productId/reviews',
    CREATE: '/stores/:storeId/products/:productId/reviews',
    CREATE_WITH_RELATIONS:
      '/stores/:storeId/products/:productId/reviews/create',
    FIND_ONE: '/stores/:storeId/products/:productId/reviews/:id',
    UPDATE: '/stores/:storeId/products/:productId/reviews/:id',
    DELETE: '/stores/:storeId/products/:productId/reviews/:id',
  },

  // Likes
  LIKES: {
    LIST: '/users/:userId/likes',
    ADD_PRODUCT_LIKE: '/users/:userId/likes/product/:productId',
    ADD_STORE_LIKE: '/users/:userId/likes/store/:storeId',
    REMOVE: '/users/:userId/likes/:id',
  },

  // News
  NEWS: {
    LIST: '/stores/:storeId/news',
    LIST_ALL: '/stores/:storeId/news/store-all',
    CREATE: '/stores/:storeId/news',
    CREATE_WITH_RELATIONS: '/stores/:storeId/news/create',
    FIND_ONE: '/stores/:storeId/news/:id',
    UPDATE: '/stores/:storeId/news/:id',
    DELETE: '/stores/:storeId/news/:id',
    PUBLISH: '/stores/:storeId/news/:id/publish',
    UNPUBLISH: '/stores/:storeId/news/:id/unpublish',
    LIST_BY_STORE: '/stores/:storeId/news/store-all',
  },

  // Analytics
  ANALYTICS: {
    // Store Analytics
    STORE: '/analytics/stores/:storeId',
    STORE_CONVERSION: '/analytics/stores/:storeId/conversion',
    STORE_RATINGS: '/analytics/stores/:storeId/ratings',
    STORE_QUICK_STATS: '/analytics/stores/:storeId/quick-stats',
    FUNNEL: '/analytics/stores/:storeId/funnel',
    REVENUE_TRENDS: '/analytics/stores/:storeId/revenue-trends',
    COHORT_ANALYSIS: '/analytics/stores/:storeId/cohort-analysis',
    USER_JOURNEY: '/analytics/stores/:storeId/user-journey',
    PERIOD_COMPARISON: '/analytics/stores/:storeId/period-comparison',
    TOP_PERFORMING_PRODUCTS:
      '/analytics/stores/:storeId/top-performing-products',
    UNDERPERFORMING: '/analytics/stores/:storeId/underperforming',

    // Product Analytics
    PRODUCT: '/analytics/stores/:storeId/products/:productId',
    PRODUCT_CONVERSION:
      '/analytics/stores/:storeId/products/:productId/conversion',
    PRODUCT_RATING: '/analytics/stores/:storeId/products/:productId/rating',
    PRODUCT_QUICK_STATS: '/analytics/products/:productId/quick-stats',

    // Top Products
    TOP_PRODUCTS: '/analytics/stores/:storeId/products/top',
    TOP_BY_VIEWS: '/analytics/stores/:storeId/products/top/views',
    TOP_BY_CONVERSION: '/analytics/stores/:storeId/products/top/conversion',

    // Global Analytics
    TOP_PERFORMING_STORES: '/analytics/stores/top-performing',
    TOP_STORES_BY_REVENUE: '/analytics/stores/top/revenue',
    STORE_COMPARISON: '/analytics/stores/compare',
    PRODUCT_COMPARISON: '/analytics/products/compare',
    BATCH_PRODUCT_STATS: '/analytics/products/batch-stats',

    // Events
    RECORD_EVENT: '/analytics/stores/:storeId/events',
    RECORD_EVENTS_BATCH: '/analytics/stores/:storeId/events/batch',

    // Sync
    SYNC_PRODUCT: '/analytics/sync/products/:productId',
    SYNC_STORE: '/analytics/sync/stores/:storeId',

    // System
    AGGREGATION: '/analytics/aggregations',
    HEALTH: '/analytics/health',
    STATS: '/analytics/stats',
    AGGREGATORS: '/analytics/aggregators',
    AGGREGATOR_SCHEMA: '/analytics/aggregators/:name/schema',

    QUICK_STATS: '/analytics/stores/:storeId/quick-stats',
    STORE_ANALYTICS: '/analytics/stores/:storeId',
    CONVERSION: '/analytics/stores/:storeId/conversion',
    RATINGS: '/analytics/stores/:storeId/ratings',
    TOP_PERFORMING: '/analytics/stores/top-performing',
    TOP_BY_REVENUE: '/analytics/stores/top/revenue',
  },

  // Admin Stats
  ADMIN_STATS: {
    STORE_SUMMARY: '/stores/:storeId/analytics/metrics/summary',
    PRODUCT_METRICS: '/stores/:storeId/analytics/products/:productId/metrics',
    TOP_PRODUCTS: '/stores/:storeId/analytics/products/top',
    RECORD_EVENT: '/stores/:storeId/analytics/events',
  },

  // Admin
  ADMIN: {
    LIST: '/admin',
    CREATE: '/admin',
    FIND_ONE: '/admin/:id',
    UPDATE: '/admin/:id',
    DELETE: '/admin/:id',
    ACTIVE: '/admin/active',
    HISTORY: '/admin/history/:userId',
    MY_HISTORY: '/admin/my-history',
    ASSIGN: '/admin/assign',
    REVOKE: '/admin/revoke/:userId',
    CHECK_STATUS: '/admin/check/:userId',
    STATS: '/admin/stats',
    SEARCH: '/admin/search',
  },

  // Inventory Notifications
  INVENTORY_NOTIFICATIONS: {
    GET_COOLDOWNS: '/admin/inventory-notifications/cooldowns',
    GET_STATS: '/admin/inventory-notifications/cooldowns/stats',
    CLEAR_COOLDOWN: '/admin/inventory-notifications/cooldowns/:variantId/:type',
    CLEAR_ALL_VARIANT: '/admin/inventory-notifications/cooldowns/:variantId',
    MANUAL_NOTIFY: '/admin/inventory-notifications/notify/:variantId/:type',
    CLEANUP: '/admin/inventory-notifications/cooldowns/cleanup',
  },

  // AI Generator
  AI_GENERATOR: {
    GENERATE_NAMES: '/stores/:storeId/ai/generator/names',
    GENERATE_DESCRIPTION: '/stores/:storeId/ai/generator/description',
    GENERATE_IDEAS: '/stores/:storeId/ai/generator/ideas',
    GENERATE_CUSTOM: '/stores/:storeId/ai/generator/custom',
    GET_TYPES: '/stores/:storeId/ai/generator/types',
    USAGE_STATS: '/stores/:storeId/ai/generator/usage',
    HEALTH: '/stores/:storeId/ai/generator/health',
  },

  // AI Predictor
  AI_PREDICTOR: {
    BUILD_FEATURES: '/stores/:storesId/ai/predictor/features/:productId',
    PREDICT_SINGLE: '/stores/:storesId/ai/predictor/predict',
    PREDICT_BATCH: '/stores/:storesId/ai/predictor/predict/batch',
    TRENDING: '/stores/:storesId/ai/predictor/stores/:storeId/trending',
    STATS: '/stores/:storesId/ai/predictor/stores/:storeId/stats',
    HEALTH: '/stores/:storesId/ai/predictor/health',
    MODEL_COMPARISON: '/stores/:storesId/ai/predictor/models/comparison',
  },

  // AI Logs
  AI_LOGS: {
    CREATE: '/stores/:storeId/ai/logs',
    LIST: '/stores/:storeId/ai/logs',
    USAGE_STATS: '/stores/:storeId/ai/logs/stats',
    TOP_FEATURES: '/stores/:storeId/ai/logs/features/top',
    DAILY_USAGE: '/stores/:storeId/ai/logs/daily',
    ERRORS: '/stores/:storeId/ai/logs/errors',
    TRENDS: '/stores/:storeId/ai/logs/trends',
    HEALTH: '/stores/:storeId/ai/logs/health',
    CLEANUP: '/stores/:storeId/ai/logs/cleanup',
  },

  // Email
  EMAIL: {
    SEND: '/email/send',
    USER_CONFIRMATION: '/email/user-confirmation',
    WELCOME: '/email/welcome',
    STOCK_ALERT: '/email/:storeId/stock-alert',
    LOW_STOCK_WARNING: '/email/:storeId/low-stock-warning',
    HEALTH: '/email/health',
    QUEUE_STATS: '/email/queue/stats',
  },
} as const;

/**
 * Build URL with path parameters
 * @param template - URL template with :param placeholders
 * @param params - Object with parameter values
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
