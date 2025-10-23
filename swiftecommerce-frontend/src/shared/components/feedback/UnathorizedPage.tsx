import { Link } from '@/shared/components/ui/Link';
import { ROUTES } from '@/app/routes/routes';
import { ShieldAlert, Home, LogIn, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/app/store';

export function UnauthorizedPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-error-light to-background px-4">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="mb-8">
          <div
            className="inline-flex items-center justify-center w-24 h-24
            bg-error/10 rounded-full mb-4"
          >
            <ShieldAlert className="h-12 w-12 text-error" />
          </div>
          <h1 className="text-6xl font-black text-error/20">403</h1>
        </div>

        {/* Message */}
        <h2 className="text-3xl font-bold text-foreground mb-4">
          Access Denied
        </h2>
        <p className="text-lg text-muted-foreground mb-8">
          You don't have permission to access this page.
          {!isAuthenticated && ' Please log in to continue.'}
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {!isAuthenticated ? (
            <>
              <Link
                to={ROUTES.LOGIN}
                className="inline-flex items-center justify-center gap-2 px-6 py-3
                  bg-primary text-primary-foreground font-semibold rounded-lg
                  hover:bg-primary/90 transition-colors shadow-md"
              >
                <LogIn className="h-5 w-5" />
                Log In
              </Link>
              <Link
                to={ROUTES.HOME}
                className="inline-flex items-center justify-center gap-2 px-6 py-3
                  border-2 border-border text-foreground font-semibold rounded-lg
                  hover:bg-muted transition-colors"
              >
                <Home className="h-5 w-5" />
                Go Home
              </Link>
            </>
          ) : (
            <>
              <Link
                to={ROUTES.HOME}
                className="inline-flex items-center justify-center gap-2 px-6 py-3
                  bg-primary text-primary-foreground font-semibold rounded-lg
                  hover:bg-primary/90 transition-colors shadow-md"
              >
                <Home className="h-5 w-5" />
                Go Home
              </Link>
              <button
                onClick={() => window.history.back()}
                className="inline-flex items-center justify-center gap-2 px-6 py-3
                  border-2 border-border text-foreground font-semibold rounded-lg
                  hover:bg-muted transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                Go Back
              </button>
            </>
          )}
        </div>

        {/* Help Text */}
        <p className="mt-8 text-sm text-muted-foreground">
          Think this is a mistake?{' '}
          <Link to="/support" className="text-primary hover:underline">
            Contact Support
          </Link>
        </p>
      </div>
    </div>
  );
}
