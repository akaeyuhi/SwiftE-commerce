import { Link } from '@/shared/components/ui/Link';
import { Logo } from '@/shared/components/ui/Logo';
import { useAuth } from '@/app/store';
import { ArrowLeft } from 'lucide-react';
import { ThemeToggle } from '@/lib/theme/ThemeToggle.tsx';

export function AdminHeader() {
  const { user } = useAuth();

  return (
    <header className="h-16 border-b border-border bg-card sticky top-0 z-50">
      <div className="h-full px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/">
            <Logo size="md" />
          </Link>
          <div className="h-6 w-px bg-border" />
          <Link
            to="/"
            className="flex items-center gap-2 text-sm text-muted-foreground
            hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Site
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-muted-foreground">
                Site Administrator
              </p>
            </div>
            <div
              className="h-10 w-10 bg-primary text-primary-foreground
            rounded-full flex items-center justify-center font-semibold"
            >
              {user?.firstName?.toUpperCase() || 'A'}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
