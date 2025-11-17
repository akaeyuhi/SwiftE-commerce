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

  /**
   * Prepare data before sending - clean and transform
   */
  protected prepareData(data: Record<string, any>): Record<string, any> {
    const cleaned: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
      // Skip undefined, null, and empty strings
      if (value === undefined || value === null || value === '') {
        continue;
      }

      // Handle arrays
      if (Array.isArray(value)) {
        // Skip empty arrays
        if (value.length === 0) continue;
        cleaned[key] = value;
        continue;
      }

      // Handle string that might be comma-separated IDs (categoryIds)
      if (typeof value === 'string' && key === 'categoryIds') {
        if (value.includes(',')) {
          cleaned[key] = value
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean);
          continue;
        }
      }

      // Handle stringified JSON
      if (
        typeof value === 'string' &&
        (value.startsWith('[') || value.startsWith('{'))
      ) {
        try {
          const parsed = JSON.parse(value);
          // Only keep non-empty arrays/objects
          if (Array.isArray(parsed) && parsed.length > 0) {
            cleaned[key] = parsed;
          } else if (
            typeof parsed === 'object' &&
            Object.keys(parsed).length > 0
          ) {
            cleaned[key] = parsed;
          }
          continue;
        } catch {
          // Not valid JSON, keep as string
        }
      }

      // Keep value as-is
      cleaned[key] = value;
    }

    return cleaned;
  }

  /**
   * Map data to FormData for multipart uploads
   */
  protected mapToFormData(
    data: Record<string, any> & {
      logo?: File;
      banner?: File;
      mainPhoto?: File;
      photos?: File[];
      avatar?: File;
    }
  ) {
    // ✅ Clean data first
    const cleanedData = this.prepareData(data);

    const formData = new FormData();
    const fileFields = ['logo', 'banner', 'mainPhoto', 'photos', 'avatar'];

    // ✅ Append non-file fields
    Object.entries(cleanedData).forEach(([key, value]) => {
      // Skip file fields - they're handled separately
      if (fileFields.includes(key)) {
        return;
      }

      // ✅ Stringify arrays and objects for FormData
      if (
        Array.isArray(value) ||
        (typeof value === 'object' && value !== null)
      ) {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, String(value));
      }
    });

    // ✅ Append file fields
    if (data.logo instanceof File) {
      formData.append('logo', data.logo);
    }

    if (data.banner instanceof File) {
      formData.append('banner', data.banner);
    }

    if (data.avatar instanceof File) {
      formData.append('avatar', data.avatar);
    }

    if (data.mainPhoto instanceof File) {
      formData.append('mainPhoto', data.mainPhoto);
    }

    // ✅ Handle photos array
    if (Array.isArray(data.photos) && data.photos.length > 0) {
      data.photos.forEach((file: File) => {
        if (file instanceof File) {
          formData.append('photos', file);
        }
      });
    }

    console.log('=== FormData Debug ===');
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(`${key}: [File] ${value.name} (${value.size} bytes)`);
      } else {
        console.log(`${key}:`, value);
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
