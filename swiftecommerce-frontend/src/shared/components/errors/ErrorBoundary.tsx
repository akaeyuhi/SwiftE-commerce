import { ReactNode, Component, ErrorInfo } from 'react';
import { ErrorState } from './ErrorState';

interface ErrorBoundaryProps {
  children: ReactNode;
  /**
   * Custom error title
   */
  title?: string;
  /**
   * Custom error description
   */
  description?: string;
  /**
   * Fallback component to render
   */
  fallback?: (error: Error, reset: () => void) => ReactNode;
  /**
   * Callback when error is caught
   */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /**
   * Show error details in development
   * @default true
   */
  showDetailsInDev?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details in development
    if (import.meta.env.VITE_ENV === 'development') {
      console.error('Error caught by boundary:', error, errorInfo);
    }

    // Call optional error callback
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  override render() {
    if (this.state.hasError) {
      const { fallback, title, description, showDetailsInDev } = this.props;
      const isDev = import.meta.env.VITE_ENV === 'development';

      // Custom fallback component
      if (fallback) {
        return fallback(this.state.error!, this.handleReset);
      }

      // Default error UI
      return (
        <ErrorState
          error={this.state.error}
          title={title}
          description={description}
          showDetails={showDetailsInDev && isDev}
          onRetry={this.handleReset}
          variant="full-page"
        />
      );
    }

    return this.props.children;
  }
}
