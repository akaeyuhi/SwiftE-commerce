import { AxiosRequestConfig, AxiosProgressEvent } from 'axios';

/**
 * HTTP Methods
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * API Response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  errors?: Record<string, string[]>;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

/**
 * API Error response
 */
export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
  statusCode: number;
  timestamp: string;
}

/**
 * Extended Axios config with custom properties
 */
export interface RequestConfig<D = any> extends AxiosRequestConfig<D> {
  _retry?: boolean;
  skipAuth?: boolean;
  skipErrorHandler?: boolean;
}

/**
 * HTTP Client interface
 */
export interface HttpClient {
  get<T = any>(url: string, config?: RequestConfig): Promise<T>;
  post<T = any, D = any>(
    url: string,
    data?: D,
    config?: RequestConfig<D>
  ): Promise<T>;
  put<T = any, D = any>(
    url: string,
    data?: D,
    config?: RequestConfig<D>
  ): Promise<T>;
  patch<T = any, D = any>(
    url: string,
    data?: D,
    config?: RequestConfig<D>
  ): Promise<T>;
  delete<T = any>(url: string, config?: RequestConfig): Promise<T>;
  request<T = any, D = any>(config: RequestConfig<D>): Promise<T>;
}

/**
 * Query parameters type
 */
export type QueryParams = Record<
  string,
  string | number | boolean | undefined | null
>;

/**
 * Upload progress callback - use Axios native type
 */
export type UploadProgressCallback = (
  progressEvent: AxiosProgressEvent
) => void;
