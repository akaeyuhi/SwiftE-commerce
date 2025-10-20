import { Link } from '@/shared/components/ui/Link';
import { useAuth, useCart } from '@/app/store';
import { ROUTES } from '@/app/routes/routes';
import { useNavigate } from '@/shared/hooks/useNavigate';
import {
  ShoppingCart,
  Menu,
  X,
  Search,
  Store,
  LayoutDashboard,
  LogOut,
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
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to={ROUTES.HOME} className="flex items-center gap-2">
            <Store className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">SwiftE-commerce</span>
          </Link>

          <div className="hidden md:flex flex-1 max-w-2xl mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg
                focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate.toCart()}
              className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ShoppingCart className="h-6 w-6" />
              {cartItemCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 bg-primary text-white text-xs
                rounded-full h-5 w-5 flex items-center justify-center"
                >
                  {cartItemCount}
                </span>
              )}
            </button>

            {isAuthenticated ? (
              <div className="hidden md:flex items-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="flex items-center gap-2 px-3 py-2
                    hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <div
                        className="h-8 w-8 bg-primary text-white rounded-full
                      flex items-center justify-center"
                      >
                        {user?.name?.toUpperCase() || 'U'}
                      </div>
                      <span className="font-medium">{user?.name}</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={() => navigate.toDashboard()}>
                      <LayoutDashboard className="h-4 w-4 mr-2" />
                      Dashboard
                    </DropdownMenuItem>
                    {user?.role === 'store_owner' && (
                      <DropdownMenuItem onClick={() => navigate.toStore()}>
                        <Store className="h-4 w-4 mr-2" />
                        My Store
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="text-red-600"
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
                  className="px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Login
                </Link>
                <Link
                  to={ROUTES.REGISTER}
                  className="px-4 py-2 bg-primary text-white
                  rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-6 py-3 border-t">
          <Link
            to={ROUTES.PRODUCTS}
            className="hover:text-primary transition-colors"
          >
            All Products
          </Link>
          <Link
            to="/categories/electronics"
            className="hover:text-primary transition-colors"
          >
            Electronics
          </Link>
          <Link
            to="/categories/clothing"
            className="hover:text-primary transition-colors"
          >
            Clothing
          </Link>
          <Link
            to="/categories/home"
            className="hover:text-primary transition-colors"
          >
            Home & Garden
          </Link>
          <Link
            to="/deals"
            className="hover:text-primary transition-colors text-red-600 font-medium"
          >
            Deals
          </Link>
        </nav>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-white">
          <div className="container mx-auto px-4 py-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Link
                to={ROUTES.PRODUCTS}
                className="block py-2 hover:text-primary transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                All Products
              </Link>
            </div>
            {isAuthenticated ? (
              <div className="space-y-2 pt-4 border-t">
                <Link
                  to={ROUTES.DASHBOARD}
                  className="flex items-center gap-2 py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <LayoutDashboard className="h-5 w-5" />
                  Dashboard
                </Link>
                {user?.role === 'store_owner' && (
                  <Link
                    to={ROUTES.STORE}
                    className="flex items-center gap-2 py-2"
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
                  className="flex items-center gap-2 py-2 text-red-600 w-full"
                >
                  <LogOut className="h-5 w-5" />
                  Logout
                </button>
              </div>
            ) : (
              <div className="space-y-2 pt-4 border-t">
                <Link
                  to={ROUTES.LOGIN}
                  className="block py-2 text-center border border-gray-300 rounded-lg"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  to={ROUTES.REGISTER}
                  className="block py-2 text-center bg-primary text-white rounded-lg"
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
