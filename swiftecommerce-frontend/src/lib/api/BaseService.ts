import { httpClient } from './HttpClient';
import { HttpClient, QueryParams, PaginatedResponse } from './types';

/**
 * Base service class for all API services
 */
export abstract class BaseService {
  protected client: HttpClient;

  constructor() {
    this.client = httpClient;
  }

  /**
   * Build URL with path parameters
   */
  protected buildUrl(template: string, params: Record<string, string>): string {
    return Object.entries(params).reduce(
      (url, [key, value]) => url.replace(`:${key}`, value),
      template
    );
  }

  /**
   * Build URL with query parameters
   * Accepts any object and converts it to QueryParams
   */
  protected buildQueryUrl(path: string, params?: Record<string, any>): string {
    if (!params) return path;

    const queryParams = Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null)
      .reduce((acc, [key, value]) => {
        acc[key] = String(value);
        return acc;
      }, {} as QueryParams);

    return httpClient.buildUrl(path, queryParams);
  }

  /**
   * Handle paginated response
   */
  protected handlePaginatedResponse<T>(response: any): PaginatedResponse<T> {
    return {
      data: response.data || response,
      meta: {
        total: response.total || response.data?.length || 0,
        page: response.page || 1,
        pageSize: response.pageSize || response.data?.length || 0,
        totalPages: response.totalPages || 1,
        hasNextPage: response.hasNextPage || false,
        hasPreviousPage: response.hasPreviousPage || false,
      },
    };
  }

  protected mapToFormData(
    data: Record<string, any> & {
      logo?: File;
      banner?: File;
      mainPhoto?: File;
      photos?: File[];
      avatar?: File;
    }
  ) {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((item) => formData.append(`${key}[]`, item));
      } else {
        formData.append(key, value);
      }
    });
    if (data.logo) {
      formData.append('logo', data.logo);
    }
    if (data.banner) {
      formData.append('banner', data.banner);
    }
    if (data.avatar) {
      formData.append('avatar', data.avatar);
    }
    if (data.mainPhoto) {
      formData.append('mainPhoto', data.mainPhoto);
    } else if (data.photos && data.photos.length > 0) {
      formData.append('mainPhoto', data.photos[0]!);
    }
    if (data.photos && data.photos.length > 0) {
      if (data.photos.length > 1) {
        data.photos
          .slice(1)
          .forEach((file: File) => formData.append('photos', file));
      }
    }

    return {
      formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    };
  }
}
