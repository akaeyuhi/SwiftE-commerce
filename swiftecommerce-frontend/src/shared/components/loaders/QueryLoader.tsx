import { LoadingState } from './LoadingState';
import { ErrorState } from '../errors/ErrorState';

interface QueryLoaderProps {
  /**
   * Is data loading
   */
  isLoading: boolean;
  /**
   * Is data being refetched
   */
  isFetching?: boolean;
  /**
   * Query error
   */
  error?: Error | null;
  /**
   * Children to render when loaded
   */
  children: React.ReactNode;
  /**
   * Function to retry the query
   */
  refetch?: () => void;
  /**
   * Loading message
   */
  loadingMessage?: string;
  /**
   * Error title
   */
  errorTitle?: string;
  /**
   * Error description
   */
  errorDescription?: string;
  /**
   * Show loading overlay on refetch
   * @default false
   */
  showOverlayOnRefetch?: boolean;
}

export function QueryLoader({
  isLoading,
  isFetching = false,
  error,
  children,
  refetch,
  loadingMessage,
  errorTitle,
  errorDescription,
  showOverlayOnRefetch = false,
}: QueryLoaderProps) {
  // Show error state if there's an error
  if (error) {
    return (
      <ErrorState
        error={error}
        title={errorTitle}
        description={errorDescription}
        onRetry={refetch}
        showRetry={!!refetch}
      />
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <LoadingState
        isLoading={true}
        loaderType="skeleton"
        loadingMessage={loadingMessage}
      >
        {children}
      </LoadingState>
    );
  }

  // Show overlay if refetching
  if (isFetching && showOverlayOnRefetch) {
    return (
      <div className="relative">
        <div className="opacity-50 pointer-events-none">{children}</div>
        <div
          className="absolute inset-0 flex items-center justify-center
        bg-background/40 backdrop-blur-sm rounded-lg"
        >
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
