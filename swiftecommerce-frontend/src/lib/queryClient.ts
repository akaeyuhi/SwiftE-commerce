import { QueryClient } from '@tanstack/react-query';

/**
 * Create and configure the React Query client
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time - how long data is considered fresh
      staleTime: 5 * 60 * 1000, // 5 minutes

      // Cache time - how long unused data stays in cache
      gcTime: 10 * 60 * 1000, // 10 minutes (was cacheTime in v4)

      // Retry configuration
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.statusCode >= 400 && error?.statusCode < 500) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },

      // Retry delay with exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Refetch configuration
      refetchOnWindowFocus: false, // Don't refetch on window focus
      refetchOnReconnect: true, // Refetch on reconnect
      refetchOnMount: true, // Refetch on component mount

      // Network mode
      networkMode: 'online', // Only fetch when online
    },

    mutations: {
      // Retry mutations once
      retry: 1,

      // Network mode for mutations
      networkMode: 'online',

      // Global mutation error handler
      onError: (error: any) => {
        console.error('Mutation error:', error);
      },
    },
  },
});
