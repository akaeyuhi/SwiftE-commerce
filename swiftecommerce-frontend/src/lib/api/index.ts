/**
 * API Services Registry
 * Central export point for all API services
 */

// ==================== CORE ====================

// HTTP Client
export { httpClient, HttpClientImpl, ApiError } from './HttpClient';
export { BaseService } from './BaseService';

// Types
export type {
  HttpClient,
  ApiResponse,
  PaginatedResponse,
  ApiErrorResponse,
  RequestConfig,
  QueryParams,
  UploadProgressCallback,
} from './types';

// ==================== FEATURE SERVICES ====================

import { authService } from '@/features/auth/api/authService.ts';
import { usersService } from '@/features/users/api/usersService';
import { storeService } from '@/features/stores/api/storesService.ts';
import { productsService } from '@/features/products/api/productsService';
import { variantsService } from '@/features/products/api/variantsService.ts';
import { categoriesService } from '@/features/categories/api/categoriesService.ts';
import { cartService } from '@/features/cart/api/cartService.ts';
import { reviewsService } from '@/features/reviews/api/reviewsService.ts';
import { ordersService } from '@/features/orders/api/ordersService.ts';
import { likesService } from '@/features/likes/api/likesService.ts';
import { newsService } from '@/features/news/api/newsService';
import { analyticsService } from '@/features/analytics/api/analyticsService.ts';
import { emailService } from '@/features/email/api/emailService.ts';
import { inventoryNotificationsService } from '@/features/inventory/api/notificationsService.ts';
import { aiGeneratorService } from '@/features/ai/api/generatorService.ts';
import { aiPredictorService } from '@/features/ai/api/predictorService.ts';
import { aiLogsService } from '@/features/ai/api/aiLogsService.ts';

// ==================== UNIFIED API OBJECT ====================

/**
 * Unified API object for easy access to all services
 *
 * @example
 * ```typescript
 * import { api } from '@/lib/api'
 *
 * // Users
 * const users = await api.users.getUsers()
 * const profile = await api.users.getProfile()
 *
 * // Products
 * const products = await api.products.getProducts(storeId, filters)
 *
 * // AI
 * const names = await api.ai.generator.generateNames(storeId, data)
 * const prediction = await api.ai.predictor.predictSingle(storeId, data)
 * ```
 */
export const api = {
  // Core
  auth: authService,
  users: usersService,
  stores: storeService,

  // Products
  products: productsService,
  variants: variantsService,
  categories: categoriesService,

  // Commerce
  cart: cartService,
  orders: ordersService,

  // Social
  reviews: reviewsService,
  likes: likesService,
  news: newsService,

  // Analytics & Insights
  analytics: analyticsService,

  // Communications
  email: emailService,

  // Inventory
  inventory: inventoryNotificationsService,

  // AI Services
  ai: {
    generator: aiGeneratorService,
    predictor: aiPredictorService,
    logs: aiLogsService,
  },
} as const;

/**
 * Type for the unified API object
 */
export type API = typeof api;
