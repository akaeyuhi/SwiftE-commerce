import { Link } from '@/shared/components/ui/Link';
import { ROUTES } from '@/app/routes/routes';
import { Home, Search, ArrowLeft } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center
    bg-gradient-to-b from-muted to-background px-4"
    >
      <div className="max-w-md w-full text-center">
        {/* 404 Number */}
        <div className="mb-8">
          <h1 className="text-9xl font-black text-primary/20">404</h1>
          <div className="relative -mt-8">
            <Search className="h-16 w-16 text-muted-foreground mx-auto" />
          </div>
        </div>

        {/* Message */}
        <h2 className="text-3xl font-bold text-foreground mb-4">
          Page Not Found
        </h2>
        <p className="text-lg text-muted-foreground mb-8">
          Sorry, we couldn&#39;t find the page you&#39;re looking for. It might
          have been moved or doesn&#39;t exist.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
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
        </div>

        {/* Help Text */}
        <p className="mt-8 text-sm text-muted-foreground">
          Need help?{' '}
          <Link to="/support" className="text-primary hover:underline">
            Contact Support
          </Link>
        </p>
      </div>
    </div>
  );
}
