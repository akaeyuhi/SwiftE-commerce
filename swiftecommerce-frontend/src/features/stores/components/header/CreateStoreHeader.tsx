import { Link } from '@/shared/components/ui/Link';
import { ROUTES } from '@/app/routes/routes';
import { ArrowLeft } from 'lucide-react';

export function CreateStoreHeader() {
  return (
    <div className="mb-8">
      <Link
        to={ROUTES.DASHBOARD}
        className="inline-flex items-center gap-2 text-sm
            text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>
      <h1 className="text-3xl font-bold text-foreground mb-2">
        Create Your Store
      </h1>
      <p className="text-muted-foreground">Start selling in just a few steps</p>
    </div>
  );
}
