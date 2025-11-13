/**
 * Query Keys Factory
 * Centralized query key management for all features
 */
export const queryKeys = {
  products: {
    all: ['products'] as const,
    lists: () => [...queryKeys.products.all, 'list'] as const,
    list: (storeId: string, filters?: Record<string, any>) =>
      [...queryKeys.products.lists(), storeId, filters] as const,
    listAll: (filters?: Record<string, any>) =>
      [...queryKeys.products.lists(), filters] as const,
    details: () => [...queryKeys.products.all, 'detail'] as const,
    detail: (storeId: string, id: string) =>
      [...queryKeys.products.details(), storeId, id] as const,
    variants: (storeId: string, productId: string) =>
      [...queryKeys.products.detail(storeId, productId), 'variants'] as const,
    reviews: (storeId: string, productId: string) =>
      [...queryKeys.products.detail(storeId, productId), 'reviews'] as const,
    stats: (storeId: string, productId: string) =>
      [...queryKeys.products.detail(storeId, productId), 'stats'] as const,
    trending: (storeId: string, params?: Record<string, any>) =>
      [...queryKeys.products.all, 'trending', storeId, params] as const,
    topBySales: (storeId: string, limit?: number) =>
      [...queryKeys.stores.all, 'top-sales-products', storeId, limit] as const,
  },

  orders: {
    all: ['orders'] as const,
    lists: () => [...queryKeys.orders.all, 'list'] as const,
    my: (filters?: Record<string, any>) =>
      [...queryKeys.orders.lists(), 'my', filters] as const,
    list: (storeId: string, filters?: Record<string, any>) =>
      [...queryKeys.orders.lists(), storeId, filters] as const,
    details: () => [...queryKeys.orders.all, 'detail'] as const,
    detail: (storeId: string, id: string) =>
      [...queryKeys.orders.details(), storeId, id] as const,
    byUser: (storeId: string, userId: string) =>
      [...queryKeys.orders.all, 'user', storeId, userId] as const,
  },

  categories: {
    all: ['categories'] as const,
    list: (storeId: string) =>
      [...queryKeys.categories.all, 'list', storeId] as const,
    tree: (storeId: string) =>
      [...queryKeys.categories.all, 'tree', storeId] as const,
    detail: (storeId: string, id: string) =>
      [...queryKeys.categories.all, 'detail', storeId, id] as const,
  },

  cart: {
    all: ['cart'] as const,
    detail: (storeId: string, userId: string) =>
      [...queryKeys.cart.all, storeId, userId] as const,
    items: (storeId: string, userId: string, cartId: string) =>
      [...queryKeys.cart.detail(storeId, userId), 'items', cartId] as const,
  },

  analytics: {
    all: ['analytics'] as const,
    store: (storeId: string, params?: Record<string, any>) =>
      [...queryKeys.analytics.all, 'store', storeId, params] as const,
    product: (
      storeId: string,
      productId: string,
      params?: Record<string, any>
    ) =>
      [
        ...queryKeys.analytics.all,
        'product',
        storeId,
        productId,
        params,
      ] as const,
    conversion: (storeId: string, params?: Record<string, any>) =>
      [...queryKeys.analytics.all, 'conversion', storeId, params] as const,
    funnel: (storeId: string, params?: Record<string, any>) =>
      [...queryKeys.analytics.all, 'funnel', storeId, params] as const,
    revenueTrends: (storeId: string, params?: Record<string, any>) =>
      [...queryKeys.analytics.all, 'revenue-trends', storeId, params] as const,
    cohort: (storeId: string, params?: Record<string, any>) =>
      [...queryKeys.analytics.all, 'cohort', storeId, params] as const,
  },

  reviews: {
    all: ['reviews'] as const,
    product: (
      storeId: string,
      productId: string,
      filters?: Record<string, any>
    ) =>
      [
        ...queryKeys.reviews.all,
        'product',
        storeId,
        productId,
        filters,
      ] as const,
  },

  user: {
    all: ['user'] as const,
    profile: () => [...queryKeys.user.all, 'profile'] as const,
    profileStats: () => [...queryKeys.user.profile(), 'stats'] as const,
    detail: (userId: string) =>
      [...queryKeys.user.all, 'detail', userId] as const,
    roles: (userId: string) =>
      [...queryKeys.user.all, 'roles', userId] as const,
    stores: (userId: string) =>
      [...queryKeys.user.all, 'stores', userId] as const,
  },

  stores: {
    all: ['stores'] as const,
    lists: () => [...queryKeys.stores.all, 'list'] as const,
    list: (filters?: Record<string, any>) =>
      [...queryKeys.stores.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.stores.all, 'detail', id] as const,
    overview: (storeId: string) =>
      [...queryKeys.stores.all, 'overview', storeId] as const,
    recentOrders: (storeId: string, limit?: number) =>
      [...queryKeys.stores.all, 'recent-orders', storeId, limit] as const,
    stats: (id: string) => [...queryKeys.stores.all, 'stats', id] as const,
    health: (id: string) => [...queryKeys.stores.all, 'health', id] as const,
  },

  variants: {
    all: ['variants'] as const,
    list: (storeId: string, productId: string) =>
      [...queryKeys.variants.all, 'list', storeId, productId] as const,
    detail: (storeId: string, productId: string, variantId: string) =>
      [
        ...queryKeys.variants.all,
        'detail',
        storeId,
        productId,
        variantId,
      ] as const,
    bySku: (storeId: string, productId: string, sku: string) =>
      [...queryKeys.variants.all, 'sku', storeId, productId, sku] as const,
  },

  likes: {
    all: ['likes'] as const,
    user: (userId: string) => [...queryKeys.likes.all, 'user', userId] as const,
  },

  news: {
    all: ['news'] as const,
    list: (storeId: string, filters?: Record<string, any>) =>
      [...queryKeys.news.all, 'list', storeId, filters] as const,
    detail: (storeId: string, id: string) =>
      [...queryKeys.news.all, 'detail', storeId, id] as const,
  },

  auth: {
    all: ['auth'] as const,
    session: () => [...queryKeys.auth.all, 'session'] as const,
  },

  ai: {
    all: ['ai'] as const,
    trending: (storeId: string) =>
      [...queryKeys.ai.all, 'trending', storeId] as const,
  },

  dashboard: {
    all: ['dashboard'] as const,
    stats: () => [...queryKeys.dashboard.all, 'stats'] as const,
    recentOrders: (limit: number) =>
      [...queryKeys.dashboard.all, 'recent-orders', limit] as const,
    myStores: (limit: number) =>
      [...queryKeys.dashboard.all, 'my-stores', limit] as const,
  },
} as const;

/**
 * Returns proper queryKey format for invalidateQueries
 */
export const invalidateFeature = {
  products: (storeId?: string) => ({
    queryKey: storeId ? queryKeys.products.lists() : queryKeys.products.all,
  }),

  orders: (storeId?: string) => ({
    queryKey: storeId ? queryKeys.orders.lists() : queryKeys.orders.all,
  }),

  analytics: (storeId?: string) => ({
    queryKey: storeId
      ? [...queryKeys.analytics.all, 'store', storeId]
      : queryKeys.analytics.all,
  }),

  cart: (storeId?: string, userId?: string) => ({
    queryKey:
      storeId && userId
        ? queryKeys.cart.detail(storeId, userId)
        : queryKeys.cart.all,
  }),

  reviews: (storeId?: string, productId?: string) => ({
    queryKey:
      storeId && productId
        ? queryKeys.reviews.product(storeId, productId)
        : queryKeys.reviews.all,
  }),

  categories: (storeId?: string) => ({
    queryKey: storeId
      ? queryKeys.categories.list(storeId)
      : queryKeys.categories.all,
  }),

  stores: () => ({
    queryKey: queryKeys.stores.lists(),
  }),

  user: (userId?: string) => ({
    queryKey: userId ? queryKeys.user.detail(userId) : queryKeys.user.all,
  }),

  variants: (storeId?: string, productId?: string) => ({
    queryKey:
      storeId && productId
        ? queryKeys.variants.list(storeId, productId)
        : queryKeys.variants.all,
  }),

  likes: (userId?: string) => ({
    queryKey: userId ? queryKeys.likes.user(userId) : queryKeys.likes.all,
  }),

  news: (storeId?: string) => ({
    queryKey: storeId ? queryKeys.news.list(storeId) : queryKeys.news.all,
  }),
};
