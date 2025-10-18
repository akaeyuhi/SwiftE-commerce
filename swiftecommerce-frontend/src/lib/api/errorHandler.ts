import { AxiosError } from 'axios';
import { toast } from 'sonner';

export interface ApiError {
  message: string;
  code?: string;
  statusCode?: number;
  details?: unknown;
}

export function handleApiError(error: unknown): ApiError {
  if (error instanceof AxiosError) {
    const statusCode = error.response?.status;
    const message = error.response?.data?.message || error.message;

    // Don't show toast for 401 (handled by interceptor)
    if (statusCode !== 401) {
      toast.error(message);
    }

    return {
      message,
      code: error.code,
      statusCode,
      details: error.response?.data,
    };
  }

  const message =
    error instanceof Error ? error.message : 'An unexpected error occurred';
  toast.error(message);

  return { message };
}
