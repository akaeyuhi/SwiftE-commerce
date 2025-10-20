import { Link } from '@/shared/components/ui/Link';
import { useLocation } from 'react-router-dom';
import { ROUTES } from '@/app/routes/routes';
import { useUI } from '@/app/store';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  TrendingUp,
  Heart,
  Settings,
  HelpCircle,
  X,
} from 'lucide-react';
import { cn } from '@/utils/cn.ts';

export function Sidebar() {
  const location = useLocation();
  const { sidebarOpen, setSidebarOpen } = useUI();

  const navigation = [
    {
      name: 'Dashboard',
      href: ROUTES.DASHBOARD,
      icon: LayoutDashboard,
    },
    {
      name: 'My Orders',
      href: ROUTES.ORDERS,
      icon: ShoppingBag,
    },
    {
      name: 'Wishlist',
      href: '/wishlist',
      icon: Heart,
    },
    {
      name: 'Track Order',
      href: '/track',
      icon: Package,
    },
    {
      name: 'Analytics',
      href: ROUTES.ANALYTICS,
      icon: TrendingUp,
    },
  ];

  const bottomNavigation = [
    {
      name: 'Settings',
      href: '/settings',
      icon: Settings,
    },
    {
      name: 'Help & Support',
      href: '/support',
      icon: HelpCircle,
    },
  ];

  return (
    <>
      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r ' +
            'border-gray-200 transform transition-transform duration-300 ease-in-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="h-full flex flex-col">
          {/* Header - Mobile only */}
          <div className="lg:hidden flex items-center justify-between p-4 border-b">
            <h2 className="font-semibold">Menu</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                    isActive
                      ? 'bg-primary text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Bottom navigation */}
          <div className="p-4 border-t space-y-1">
            {bottomNavigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                    isActive
                      ? 'bg-primary text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </aside>
    </>
  );
}
