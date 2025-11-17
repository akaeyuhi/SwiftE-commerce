import { Link } from '@/shared/components/ui/Link';
import { useAuth } from '@/app/store';
import { useNavigate } from '@/shared/hooks/useNavigate';
import { ROUTES } from '@/app/routes/routes';
import { Search, ShoppingCart, Store, User, LogOut } from 'lucide-react';
import { buildUrl } from '@/config/api.config.ts';

interface MobileMenuProps {
  onClose: () => void;
}

export function MobileMenu({ onClose }: MobileMenuProps) {
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate.toHome();
    onClose();
  };

  return (
    <div className="md:hidden border-t border-border bg-background">
      <div className="container mx-auto px-4 py-4 space-y-4">
        {/* Search - Mobile */}
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2
            -translate-y-1/2 h-5 w-5 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Search stores..."
            className="w-full pl-10 pr-4 py-2 bg-muted border border-input rounded-lg
              text-foreground placeholder:text-muted-foreground"
          />
        </div>

        {/* User actions */}
        {isAuthenticated ? (
          <div className="space-y-2 pt-4 border-t border-border">
            <Link
              to={buildUrl(ROUTES.USER_PROFILE, { userId: user!.id })}
              className="flex items-center gap-2 py-2 text-foreground"
              onClick={onClose}
            >
              <User className="h-5 w-5" />
              Profile
            </Link>
            <Link
              to={ROUTES.ORDERS}
              className="flex items-center gap-2 py-2 text-foreground"
              onClick={onClose}
            >
              <ShoppingCart className="h-5 w-5" />
              My Orders
            </Link>
            <Link
              to={ROUTES.MY_STORES}
              className="flex items-center gap-2 py-2 text-foreground"
              onClick={onClose}
            >
              <Store className="h-5 w-5" />
              My Stores
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 py-2 text-error w-full"
            >
              <LogOut className="h-5 w-5" />
              Logout
            </button>
          </div>
        ) : (
          <div className="space-y-2 pt-4 border-t border-border">
            <Link
              to={ROUTES.LOGIN}
              className="block py-2 text-center border border-border text-foreground rounded-lg"
              onClick={onClose}
            >
              Login
            </Link>
            <Link
              to={ROUTES.REGISTER}
              className="block py-2 text-center bg-primary text-primary-foreground rounded-lg"
              onClick={onClose}
            >
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
