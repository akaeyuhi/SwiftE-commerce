/**
 * Route paths constants
 */
export const ROUTES = {
  // Public routes
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',

  // Product routes
  PRODUCTS: '/products',
  PRODUCT_DETAIL: '/products/:productId',

  // Cart & Checkout
  CART: '/cart',
  CHECKOUT: '/checkout',

  // Dashboard (authenticated)
  DASHBOARD: '/dashboard',
  ANALYTICS: '/dashboard/analytics',

  // Orders (authenticated)
  ORDERS: '/orders',
  ORDER_DETAIL: '/orders/:orderId',

  // Store Owner routes
  STORE: '/store',
  STORE_SETTINGS: '/store/settings',
  STORE_ANALYTICS: '/store/analytics',
  STORE_PRODUCTS: '/store/products',
  STORE_PRODUCTS_CREATE: '/store/products/create',
  STORE_PRODUCTS_EDIT: '/store/products/:productId/edit',
  STORE_ORDERS: '/store/orders',

  // Admin routes
  ADMIN: '/admin',
  ADMIN_USERS: '/admin/users',
  ADMIN_STORES: '/admin/stores',

  // Error pages
  NOT_FOUND: '*',
  UNAUTHORIZED: '/unauthorized',
} as const;

/**
 * Helper to build route paths with params
 */
export const buildRoute = {
  productDetail: (productId: string) => `/products/${productId}`,
  orderDetail: (orderId: string) => `/orders/${orderId}`,
  storeProductEdit: (productId: string) => `/store/products/${productId}/edit`,
};
