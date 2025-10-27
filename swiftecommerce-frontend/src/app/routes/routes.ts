export const ROUTES = {
  // Public routes
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',

  // Stores (Public)
  STORES: '/stores',
  STORE_PUBLIC: '/stores/:storeId',

  // My Stores (Authenticated)
  MY_STORES: '/my-stores',

  // Product routes (Public)
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

  // Store Management (requires store access)
  STORE_CREATE: '/store/create',
  STORE: '/store/:storeId',
  STORE_OVERVIEW: '/store/:storeId/overview',
  STORE_SETTINGS: '/store/:storeId/settings',
  STORE_TEAM: '/store/:storeId/team',
  STORE_ANALYTICS: '/store/:storeId/analytics',
  STORE_PRODUCTS: '/store/:storeId/products',
  STORE_PRODUCTS_CREATE: '/store/:storeId/products/create',
  STORE_PRODUCTS_EDIT: '/store/:storeId/products/:productId/edit',
  STORE_ORDERS: '/store/:storeId/orders',
  STORE_NEWS: '/store/:storeId/news',
  STORE_NEWS_MANAGEMENT: '/store/:storeId/news/management',

  USER_PROFILE: '/users/:userId',

  // Admin routes
  ADMIN: '/admin',
  ADMIN_USERS: '/admin/users',
  ADMIN_STORES: '/admin/stores',

  // Error pages
  NOT_FOUND: '*',
  UNAUTHORIZED: '/unauthorized',

  // Legal pages
  ABOUT: '/about',
  CONTACT: '/contact',
  FAQ: '/faq',
  SHIPPING: '/shipping',
  RETURNS: '/returns',
  PRIVACY: '/privacy',
  TERMS: '/terms',
  COOKIES: '/cookies',

  // Track and Wishlist
  TRACK_ORDER: '/track-order',
  WISHLIST: '/wishlist',
} as const;

export const buildRoute = {
  productDetail: (productId: string) => `/products/${productId}`,
  orderDetail: (orderId: string) => `/orders/${orderId}`,
  storePublic: (storeId: string) => `/stores/${storeId}`,
  storeOverview: (storeId: string) => `/store/${storeId}/overview`,
  storeSettings: (storeId: string) => `/store/${storeId}/settings`,
  storeTeam: (storeId: string) => `/store/${storeId}/team`,
  storeAnalytics: (storeId: string) => `/store/${storeId}/analytics`,
  storeProducts: (storeId: string) => `/store/${storeId}/products`,
  storeProductCreate: (storeId: string) => `/store/${storeId}/products/create`,
  storeProductEdit: (storeId: string, productId: string) =>
    `/store/${storeId}/products/${productId}/edit`,
  storeOrders: (storeId: string) => `/store/${storeId}/orders`,
};
