import axios, {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios';
import { apiConfig } from '@/config/api.config';
import {
  getAccessToken,
  setAccessToken,
  clearTokens,
} from '@/lib/auth/tokenManager';
import {
  HttpClient,
  RequestConfig,
  ApiResponse,
  ApiErrorResponse,
  QueryParams,
  UploadProgressCallback,
} from './types';
import { toast } from 'sonner';

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
   * Setup request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig & { skipAuth?: boolean }) => {
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

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        // Log response in development
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

        // Handle 401 - Token refresh
        if (
          error.response?.status === 401 &&
          !originalRequest._retry &&
          originalRequest
        ) {
          originalRequest._retry = true;

          try {
            const { data } = await axios.post(
              `${apiConfig.baseURL}/auth/refresh`,
              {},
              { withCredentials: true }
            );

            setAccessToken(data.accessToken);

            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
            }

            return this.client(originalRequest);
          } catch (refreshError) {
            clearTokens();
            window.location.href = '/login';
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
    return response.data.data as T;
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
    return response.data.data as T;
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
    return response.data.data as T;
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
    return response.data.data as T;
  }

  /**
   * DELETE request
   */
  async delete<T = any>(url: string, config?: RequestConfig): Promise<T> {
    const response = await this.client.delete<ApiResponse<T>>(url, config);
    return response.data.data as T;
  }

  /**
   * Generic request method
   */
  async request<T = any, D = any>(config: RequestConfig<D>): Promise<T> {
    const response = await this.client.request<ApiResponse<T>>(config);
    return response.data.data as T;
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
    return response.data.data as T;
  }

  /**
   * Build URL with query parameters
   */
  buildUrl(path: string, params?: QueryParams): string {
    if (!params) return path;

    const queryString = Object.entries(params)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .filter(([_, value]) => value !== undefined && value !== null)
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
