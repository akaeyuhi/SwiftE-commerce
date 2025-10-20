/**
 * Query Keys Factory
 */
export const queryKeys = {
  products: {
    all: ['products'] as const,
    lists: () => [...queryKeys.products.all, 'list'] as const,
    list: (storeId: string, filters?: Record<string, any>) =>
      [...queryKeys.products.lists(), storeId, filters] as const,
    details: () => [...queryKeys.products.all, 'detail'] as const,
    detail: (storeId: string, id: string) =>
      [...queryKeys.products.details(), storeId, id] as const,
    variants: (storeId: string, productId: string) =>
      [...queryKeys.products.detail(storeId, productId), 'variants'] as const,
    reviews: (storeId: string, productId: string) =>
      [...queryKeys.products.detail(storeId, productId), 'reviews'] as const,
  },

  orders: {
    all: ['orders'] as const,
    lists: () => [...queryKeys.orders.all, 'list'] as const,
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
  },

  ai: {
    all: ['ai'] as const,
    predictions: (storeId: string, productId: string) =>
      [...queryKeys.ai.all, 'predictions', storeId, productId] as const,
    trending: (storeId: string) =>
      [...queryKeys.ai.all, 'trending', storeId] as const,
    logs: (storeId: string, params?: Record<string, any>) =>
      [...queryKeys.ai.all, 'logs', storeId, params] as const,
  },
} as const;

/**
 * Returns proper queryKey format for invalidateQueries
 */
export const invalidateFeature = {
  products: (storeId?: string) => ({
    queryKey: storeId
      ? queryKeys.products.lists() // Invalidate all lists for this store
      : queryKeys.products.all, // Invalidate everything
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
};
