import { Link } from '@/shared/components/ui/Link';
import { ROUTES } from '@/app/routes/routes';

export function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4">403</h1>
        <p className="text-xl text-muted-foreground mb-8">
          You don&#39;t have permission to access this page
        </p>
        <Link to={ROUTES.HOME} variant="primary">
          Go back home
        </Link>
      </div>
    </div>
  );
}
