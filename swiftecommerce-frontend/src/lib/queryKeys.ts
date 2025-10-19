/**
 * Query keys factory
 * Provides consistent, hierarchical query keys
 */

export const queryKeys = {
  // Products
  products: {
    all: ['products'] as const,
    lists: () => [...queryKeys.products.all, 'list'] as const,
    list: (storeId: string, filters?: any) =>
      [...queryKeys.products.lists(), storeId, filters] as const,
    details: () => [...queryKeys.products.all, 'detail'] as const,
    detail: (storeId: string, id: string) =>
      [...queryKeys.products.details(), storeId, id] as const,
  },

  // Orders
  orders: {
    all: ['orders'] as const,
    lists: () => [...queryKeys.orders.all, 'list'] as const,
    list: (storeId: string, filters?: any) =>
      [...queryKeys.orders.lists(), storeId, filters] as const,
    details: () => [...queryKeys.orders.all, 'detail'] as const,
    detail: (storeId: string, id: string) =>
      [...queryKeys.orders.details(), storeId, id] as const,
  },

  // Analytics
  analytics: {
    all: ['analytics'] as const,
    store: (storeId: string, params?: any) =>
      [...queryKeys.analytics.all, 'store', storeId, params] as const,
    product: (storeId: string, productId: string, params?: any) =>
      [
        ...queryKeys.analytics.all,
        'product',
        storeId,
        productId,
        params,
      ] as const,
  },

  // Reviews
  reviews: {
    all: ['reviews'] as const,
    product: (storeId: string, productId: string, filters?: any) =>
      [
        ...queryKeys.reviews.all,
        'product',
        storeId,
        productId,
        filters,
      ] as const,
  },

  // User
  user: {
    all: ['user'] as const,
    profile: () => [...queryKeys.user.all, 'profile'] as const,
    roles: (userId: string) =>
      [...queryKeys.user.all, 'roles', userId] as const,
  },
} as const;
