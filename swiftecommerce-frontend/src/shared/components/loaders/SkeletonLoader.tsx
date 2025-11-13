import { cn } from '@/shared/utils/cn';

interface SkeletonLoaderProps {
  /**
   * Number of skeleton lines to show
   * @default 3
   */
  count?: number;
  /**
   * Type of skeleton
   * 'text' | 'card' | 'grid' | 'table' | 'circle'
   * @default 'text'
   */
  variant?: 'text' | 'card' | 'grid' | 'table' | 'circle';
  /**
   * Grid columns for grid variant
   * @default 3
   */
  columns?: number;
  /**
   * Custom height
   * @default 'h-4' for text, 'h-12' for card
   */
  height?: string;
  /**
   * Custom width
   * @default 'w-full'
   */
  width?: string;
  /**
   * Additional CSS classes
   */
  className?: string;
}

export function SkeletonLoader({
  count = 3,
  variant = 'text',
  columns = 3,
  height,
  width = 'w-full',
  className,
}: SkeletonLoaderProps) {
  const baseClasses = 'bg-muted animate-pulse rounded-lg';

  const getHeight = () => {
    if (height) return height;
    return variant === 'card'
      ? 'h-64'
      : variant === 'circle'
        ? 'h-12 w-12'
        : 'h-4';
  };

  const getDefaultHeight = getHeight();

  switch (variant) {
    case 'text':
      return (
        <div className={cn('space-y-3', className)}>
          {[...Array(count)].map((_, i) => (
            <div
              key={i}
              className={cn(
                baseClasses,
                getDefaultHeight,
                width,
                i === count - 1 && 'w-4/5'
              )}
            />
          ))}
        </div>
      );

    case 'card':
      return (
        <div className={cn('space-y-4', className)}>
          {[...Array(count)].map((_, i) => (
            <div key={i} className={cn(baseClasses, 'p-4', width)}>
              <div className={cn(baseClasses, 'h-4 mb-3 w-3/4')} />
              <div className={cn(baseClasses, 'h-4 mb-2 w-full')} />
              <div className={cn(baseClasses, 'h-4 w-2/3')} />
            </div>
          ))}
        </div>
      );

    case 'grid':
      return (
        <div className={cn(`grid grid-cols-${columns} gap-4`, className)}>
          {[...Array(count)].map((_, i) => (
            <div
              key={i}
              className={cn(baseClasses, getDefaultHeight, 'w-full')}
            />
          ))}
        </div>
      );

    case 'table':
      return (
        <div className={cn('space-y-3', className)}>
          {/* Table Header */}
          <div className="flex gap-3">
            {[...Array(4)].map((_, i) => (
              <div
                key={`header-${i}`}
                className={cn(baseClasses, 'h-8 flex-1')}
              />
            ))}
          </div>
          {/* Table Rows */}
          {[...Array(count)].map((_, i) => (
            <div key={`row-${i}`} className="flex gap-3">
              {[...Array(4)].map((_, j) => (
                <div
                  key={`cell-${j}`}
                  className={cn(baseClasses, 'h-6 flex-1')}
                />
              ))}
            </div>
          ))}
        </div>
      );

    case 'circle':
      return (
        <div className={cn('flex gap-4', className)}>
          {[...Array(count)].map((_, i) => (
            <div
              key={i}
              className={cn(baseClasses, 'h-12 w-12 rounded-full')}
            />
          ))}
        </div>
      );

    default:
      return null;
  }
}
