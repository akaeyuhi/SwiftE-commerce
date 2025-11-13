import { Loader } from 'lucide-react';

interface LoadingStateProps {
  /**
   * Is data loading?
   */
  isLoading: boolean;
  /**
   * Is data loaded?
   */
  isLoaded?: boolean;
  /**
   * Children to render when not loading
   */
  children: React.ReactNode;
  /**
   * Show loading overlay instead of full screen
   * @default false
   */
  overlay?: boolean;
  /**
   * Custom loading message
   */
  loadingMessage?: string;
  /**
   * Type of loader
   * @default 'spinner'
   */
  loaderType?: 'spinner' | 'skeleton';
  /**
   * Skeleton variant (only for loaderType='skeleton')
   */
  skeletonVariant?: 'text' | 'card' | 'grid' | 'table';
  /**
   * Skeleton count
   */
  skeletonCount?: number;
}

export async function LoadingState({
  isLoading,
  isLoaded = !isLoading,
  children,
  overlay = false,
  loadingMessage = 'Loading...',
  loaderType = 'spinner',
  skeletonVariant = 'text',
  skeletonCount = 3,
}: LoadingStateProps) {
  if (!isLoading && isLoaded) {
    return <>{children}</>;
  }

  if (isLoading && overlay) {
    return (
      <div className="relative">
        <div className="opacity-50">{children}</div>
        <div
          className="absolute inset-0 flex items-center
        justify-center bg-background/50 backdrop-blur-sm rounded-lg"
        >
          <div className="flex flex-col items-center gap-2">
            <Loader className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-foreground">{loadingMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    if (loaderType === 'skeleton') {
      const SkeletonLoader = (await import('./SkeletonLoader')).SkeletonLoader;
      return <SkeletonLoader variant={skeletonVariant} count={skeletonCount} />;
    }

    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{loadingMessage}</p>
      </div>
    );
  }

  return <>{children}</>;
}
