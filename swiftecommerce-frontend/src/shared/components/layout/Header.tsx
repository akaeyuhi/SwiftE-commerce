import { Link } from '@/shared/components/ui/Link';
import { Logo } from '@/shared/components/ui/Logo';
import { useAuth, useCart } from '@/app/store';
import { ROUTES } from '@/app/routes/routes';
import { useNavigate } from '@/shared/hooks/useNavigate';
import {
  ShoppingCart,
  Menu,
  X,
  Search,
  LayoutDashboard,
  LogOut,
  Store,
} from 'lucide-react';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';

export function Header() {
  const { isAuthenticated, user, logout } = useAuth();
  const { getItemCount } = useCart();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const cartItemCount = getItemCount();

  const handleLogout = () => {
    logout();
    navigate.toHome();
  };

  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            to={ROUTES.HOME}
            className="hover:opacity-80 transition-opacity"
          >
            <Logo size="md" />
          </Link>

          {/* Search bar - Desktop */}
          <div className="hidden md:flex flex-1 max-w-2xl mx-8">
            <div className="relative w-full">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2
              h-5 w-5 text-muted-foreground"
              />
              <input
                type="text"
                placeholder="Search stores..."
                className="w-full pl-10 pr-4 py-2 bg-muted border border-input rounded-lg
                  text-foreground placeholder:text-muted-foreground
                  focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent
                  transition-shadow"
              />
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* Cart */}
            <button
              onClick={() => navigate.toCart()}
              className="relative p-2 hover:bg-muted rounded-lg transition-colors"
              aria-label="Shopping cart"
            >
              <ShoppingCart className="h-6 w-6 text-foreground" />
              {cartItemCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs
                    rounded-full h-5 w-5 flex items-center justify-center font-semibold"
                >
                  {cartItemCount}
                </span>
              )}
            </button>

            {/* User menu - Desktop */}
            {isAuthenticated ? (
              <div className="hidden md:flex items-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="flex items-center gap-2 px-3 py-2
                        hover:bg-muted rounded-lg transition-colors"
                    >
                      <div
                        className="h-8 w-8 bg-primary text-primary-foreground rounded-full
                          flex items-center justify-center font-semibold"
                      >
                        {user?.firstName?.toUpperCase() || 'U'}
                      </div>
                      <span className="font-medium text-foreground">
                        {user?.firstName}
                      </span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={() => navigate.toDashboard()}>
                      <LayoutDashboard className="h-4 w-4 mr-2" />
                      Dashboard
                    </DropdownMenuItem>
                    {user?.siteRole === 'SITE_ADMIN' && (
                      <DropdownMenuItem onClick={() => navigate.toStore()}>
                        <Store className="h-4 w-4 mr-2" />
                        My Store
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="text-error focus:text-error"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link
                  to={ROUTES.LOGIN}
                  className="px-4 py-2 text-foreground hover:bg-muted
                  rounded-lg transition-colors font-medium"
                >
                  Login
                </Link>
                <Link
                  to={ROUTES.REGISTER}
                  className="px-4 py-2 bg-primary text-primary-foreground
                    rounded-lg hover:bg-primary/90 transition-colors font-medium shadow-sm"
                >
                  Sign Up
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 hover:bg-muted rounded-lg transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6 text-foreground" />
              ) : (
                <Menu className="h-6 w-6 text-foreground" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
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
                  to={ROUTES.DASHBOARD}
                  className="flex items-center gap-2 py-2 text-foreground"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <LayoutDashboard className="h-5 w-5" />
                  Dashboard
                </Link>
                {user?.siteRole === 'SITE_ADMIN' && (
                  <Link
                    to={ROUTES.STORE}
                    className="flex items-center gap-2 py-2 text-foreground"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Store className="h-5 w-5" />
                    My Store
                  </Link>
                )}
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
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
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  to={ROUTES.REGISTER}
                  className="block py-2 text-center bg-primary text-primary-foreground rounded-lg"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
