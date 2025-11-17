import { Button } from '@/shared/components/ui/Button';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { useNavigate } from '@/shared/hooks/useNavigate';
import { cn } from '@/shared/utils/cn';

interface ErrorStateProps {
  /**
   * Error to display
   */
  error?: Error | string | null;
  /**
   * Error title
   * @default 'Something went wrong'
   */
  title?: string;
  /**
   * Error description
   */
  description?: string;
  /**
   * Show error details
   * @default false
   */
  showDetails?: boolean;
  /**
   * Callback to retry the failed action
   */
  onRetry?: () => void;
  /**
   * Show retry button
   * @default true
   */
  showRetry?: boolean;
  /**
   * Additional action buttons
   */
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'outline' | 'ghost';
  }>;
  /**
   * Type of error state
   * 'inline' | 'card' | 'full-page'
   * @default 'card'
   */
  variant?: 'inline' | 'card' | 'full-page';
  /**
   * Custom className
   */
  className?: string;
}

export function ErrorState({
  error,
  title = 'Something went wrong',
  description,
  showDetails = false,
  onRetry,
  showRetry = true,
  actions = [],
  variant = 'card',
  className,
}: ErrorStateProps) {
  const navigate = useNavigate();

  const errorMessage = error instanceof Error ? error.message : String(error);
  const finalDescription =
    description ||
    (error ? 'An unexpected error occurred. Please try again.' : '');

  console.error(error);

  const content = (
    <div
      className={cn('flex flex-col items-center gap-4 text-center', className)}
    >
      <AlertCircle className="h-12 w-12 text-error" />

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
        {finalDescription && (
          <p className="text-sm text-muted-foreground">{finalDescription}</p>
        )}
      </div>

      {showDetails && errorMessage && (
        <div className="bg-muted p-3 rounded-lg w-full text-left max-w-md">
          <p className="text-xs font-mono text-muted-foreground break-words">
            {errorMessage}
          </p>
        </div>
      )}

      <div className="flex gap-2 flex-wrap justify-center">
        {showRetry && onRetry && (
          <Button onClick={onRetry} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        )}

        {actions.map((action, idx) => (
          <Button
            key={idx}
            onClick={action.onClick}
            variant={(action.variant as any) || 'outline'}
            size="sm"
          >
            {action.label}
          </Button>
        ))}

        {(showRetry || actions.length > 0) && (
          <Button onClick={() => navigate.back()} variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        )}
      </div>
    </div>
  );

  if (variant === 'inline') {
    return (
      <div className="p-4 bg-error/5 border border-error/20 rounded-lg">
        {content}
      </div>
    );
  }

  if (variant === 'full-page') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        {content}
      </div>
    );
  }

  // card variant (default)
  return (
    <Card>
      <CardContent className="p-6">{content}</CardContent>
    </Card>
  );
}
