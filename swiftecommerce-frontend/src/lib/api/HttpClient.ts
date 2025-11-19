import axios, {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from 'axios';
import { apiConfig } from '@/config/api.config';
import {
  HttpClient,
  RequestConfig,
  ApiResponse,
  ApiErrorResponse,
  QueryParams,
  UploadProgressCallback,
} from './types';
import { toast } from 'sonner';
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
} from '@/lib/auth/tokenManager.ts';

/**
 * ISO 8601 date regex pattern
 */
const ISO_DATETIME_REGEX =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?([+-]\d{2}:\d{2}|Z)?$/;
const ISO_DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public override message: string,
    public errors?: Record<string, string[]>,
    public response?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static fromAxiosError(error: AxiosError<ApiErrorResponse>): ApiError {
    const statusCode = error.response?.status || 500;
    const message =
      error.response?.data?.message || error.message || 'An error occurred';
    const errors = error.response?.data?.errors;

    return new ApiError(statusCode, message, errors, error.response?.data);
  }
}

/**
 * Enhanced HTTP Client class
 */
export class HttpClientImpl implements HttpClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: apiConfig.baseURL,
      timeout: apiConfig.timeout,
      headers: apiConfig.headers,
      withCredentials: true,
    });

    this.setupInterceptors();
  }

  /**
   * Parse dates in object recursively
   */
  private parseDates(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (obj instanceof Date) {
      return obj;
    }

    if (typeof obj === 'string') {
      if (ISO_DATETIME_REGEX.test(obj) || ISO_DATE_ONLY_REGEX.test(obj)) {
        const date = new Date(obj);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.parseDates(item));
    }

    if (
      typeof obj === 'object' &&
      obj.constructor === Object &&
      !(obj instanceof Date)
    ) {
      const parsed: any = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          parsed[key] = this.parseDates(obj[key]);
        }
      }
      return parsed;
    }
    return obj;
  }

  /**
   * Parse numeric strings to numbers (for specific fields)
   */
  private parseNumbers(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (obj instanceof Date) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.parseNumbers(item));
    }

    if (typeof obj === 'object' && obj.constructor === Object) {
      const parsed: any = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          const value = obj[key];

          if (
            typeof value === 'string' &&
            /^-?\d+\.?\d*$/.test(value) &&
            (key.toLowerCase().includes('price') ||
              key.toLowerCase().includes('total') ||
              key.toLowerCase().includes('amount') ||
              key.toLowerCase().includes('average') ||
              key.toLowerCase().includes('count') ||
              key.toLowerCase().includes('quantity') ||
              key.toLowerCase().includes('revenue') ||
              key.toLowerCase().includes('rating'))
          ) {
            parsed[key] = parseFloat(value);
          } else {
            parsed[key] = this.parseNumbers(value);
          }
        }
      }
      return parsed;
    }

    return obj;
  }

  /**
   * Serialize dates to ISO strings for request
   */
  private serializeDates(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (obj instanceof Date) {
      return obj.toISOString();
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.serializeDates(item));
    }

    if (typeof obj === 'object' && obj.constructor === Object) {
      const serialized: any = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          serialized[key] = this.serializeDates(obj[key]);
        }
      }
      return serialized;
    }

    return obj;
  }

  /**
   * Setup request and response interceptors
   */
  private setupInterceptors(): void {
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig & { skipAuth?: boolean }) => {
        // Serialize dates in request body
        if (config.data && typeof config.data === 'object') {
          config.data = this.serializeDates(config.data);
        }

        // Serialize dates in query params
        if (config.params && typeof config.params === 'object') {
          config.params = this.serializeDates(config.params);
        }

        // Add auth token if not skipped
        if (!config.skipAuth) {
          const token = getAccessToken();
          if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }

        // Log request in development
        if (import.meta.env.DEV) {
          console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`, {
            params: config.params,
            data: config.data,
          });
        }

        return config;
      },
      (error) => {
        console.error('❌ Request error:', error);
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        if (response.data && typeof response.data === 'object') {
          response.data = this.parseDates(response.data);
          response.data = this.parseNumbers(response.data);
        }

        if (import.meta.env.DEV) {
          console.log(
            `✅ ${response.config.method?.toUpperCase()} ${response.config.url}`,
            {
              status: response.status,
              data: response.data,
            }
          );
        }

        return response;
      },
      async (error: AxiosError<ApiErrorResponse>) => {
        const originalRequest = error.config as RequestConfig;

        // Parse dates in error response too
        if (error.response?.data) {
          error.response.data = this.parseDates(error.response.data);
        }

        // Handle 401 - Token refresh
        if (
          error.response?.status === 401 &&
          !originalRequest._retry &&
          originalRequest
        ) {
          originalRequest._retry = true;

          try {
            const refreshToken = getRefreshToken();
            const { data } = await axios.post(
              `${apiConfig.baseURL}/auth/refresh`,
              { refreshToken },
              { withCredentials: true }
            );

            setAccessToken(data.accessToken);

            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
            }

            return this.client(originalRequest);
          } catch (refreshError) {
            clearTokens();
            //window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        // Handle errors
        if (!originalRequest.skipErrorHandler) {
          this.handleError(error);
        }

        return Promise.reject(ApiError.fromAxiosError(error));
      }
    );
  }

  /**
   * Handle API errors
   */
  private handleError(error: AxiosError<ApiErrorResponse>): void {
    const statusCode = error.response?.status;

    // Don't show toast for 401 (handled by interceptor)
    if (statusCode === 401) return;

    const message =
      error.response?.data?.message || error.message || 'An error occurred';

    // Show different toast types based on status
    if (statusCode && statusCode >= 500) {
      toast.error('Server Error', { description: message });
    } else if (statusCode === 404) {
      toast.error('Not Found', { description: message });
    } else if (statusCode === 403) {
      toast.error('Forbidden', { description: message });
    } else if (statusCode && statusCode >= 400) {
      toast.error('Request Failed', { description: message });
    } else {
      toast.error('Error', { description: message });
    }
  }

  /**
   * GET request
   */
  async get<T = any>(url: string, config?: RequestConfig): Promise<T> {
    const response = await this.client.get<ApiResponse<T>>(url, config);
    return response.data as T;
  }

  /**
   * POST request
   */
  async post<T = any, D = any>(
    url: string,
    data?: D,
    config?: RequestConfig<D>
  ): Promise<T> {
    const response = await this.client.post<ApiResponse<T>>(url, data, config);
    return response.data as T;
  }

  /**
   * PUT request
   */
  async put<T = any, D = any>(
    url: string,
    data?: D,
    config?: RequestConfig<D>
  ): Promise<T> {
    const response = await this.client.put<ApiResponse<T>>(url, data, config);
    return response.data as T;
  }

  /**
   * PATCH request
   */
  async patch<T = any, D = any>(
    url: string,
    data?: D,
    config?: RequestConfig<D>
  ): Promise<T> {
    const response = await this.client.patch<ApiResponse<T>>(url, data, config);
    return response.data as T;
  }

  /**
   * DELETE request
   */
  async delete<T = any>(url: string, config?: RequestConfig): Promise<T> {
    const response = await this.client.delete<ApiResponse<T>>(url, config);
    return response.data as T;
  }

  /**
   * Generic request method
   */
  async request<T = any, D = any>(config: RequestConfig<D>): Promise<T> {
    const response = await this.client.request<ApiResponse<T>>(config);
    return response.data as T;
  }

  /**
   * Upload file with progress
   */
  async upload<T = any>(
    url: string,
    formData: FormData,
    onProgress?: UploadProgressCallback
  ): Promise<T> {
    const response = await this.client.post<ApiResponse<T>>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: onProgress,
    });
    return response.data as T;
  }

  /**
   * Build URL with query parameters
   */
  buildUrl(path: string, params?: QueryParams): string {
    if (!params) return path;

    const queryString = Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(
        ([key, value]) =>
          `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`
      )
      .join('&');

    return queryString ? `${path}?${queryString}` : path;
  }
}

/**
 * Export singleton instance
 */
export const httpClient = new HttpClientImpl();
