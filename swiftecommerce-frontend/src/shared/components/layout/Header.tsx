import { Link } from '@/shared/components/ui/Link';
import { Logo } from '@/shared/components/ui/Logo';
import { useAuth } from '@/app/store';
import { ROUTES } from '@/app/routes/routes';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { CartDropdown } from '@/shared/components/cart/CartDropdown';
import { UserMenu } from '@/shared/components/header/UserMenu';
import { SearchBar as HeaderSearchBar } from '@/shared/components/header/SearchBar';
import { MobileMenu } from '@/shared/components/header/MobileMenu';
import { ThemeToggle } from '@/lib/theme/ThemeToggle.tsx';

export function Header() {
  const { isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
            <HeaderSearchBar />
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            <ThemeToggle />

            {isAuthenticated ? <CartDropdown /> : <></>}

            {/* User menu - Desktop */}
            {isAuthenticated ? (
              <div className="hidden md:flex items-center">
                <UserMenu />
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
        <MobileMenu onClose={() => setMobileMenuOpen(false)} />
      )}
    </header>
  );
}
