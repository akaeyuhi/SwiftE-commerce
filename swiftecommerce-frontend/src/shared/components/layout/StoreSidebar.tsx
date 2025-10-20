import { Link } from '@/shared/components/ui/Link';
import { useLocation } from 'react-router-dom';
import { ROUTES } from '@/app/routes/routes';
import { useUI } from '@/app/store';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  TrendingUp,
  Settings,
  FileText,
  Users,
  BarChart3,
  Tag,
  Sparkles,
  X,
} from 'lucide-react';
import { cn } from '@/utils/cn.ts';

export function StoreSidebar() {
  const location = useLocation();
  const { sidebarOpen, setSidebarOpen } = useUI();

  const navigation = [
    {
      name: 'Overview',
      href: ROUTES.STORE,
      icon: LayoutDashboard,
    },
    {
      name: 'Products',
      href: ROUTES.STORE_PRODUCTS,
      icon: Package,
    },
    {
      name: 'Orders',
      href: ROUTES.STORE_ORDERS,
      icon: ShoppingBag,
    },
    {
      name: 'Analytics',
      href: ROUTES.STORE_ANALYTICS,
      icon: BarChart3,
    },
    {
      name: 'Categories',
      href: '/store/categories',
      icon: Tag,
    },
    {
      name: 'Reviews',
      href: '/store/reviews',
      icon: FileText,
    },
    {
      name: 'Customers',
      href: '/store/customers',
      icon: Users,
    },
    {
      name: 'AI Tools',
      href: '/store/ai',
      icon: Sparkles,
      badge: 'New',
    },
  ];

  const bottomNavigation = [
    {
      name: 'Store Settings',
      href: ROUTES.STORE_SETTINGS,
      icon: Settings,
    },
    {
      name: 'Performance',
      href: '/store/performance',
      icon: TrendingUp,
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
          'fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white ' +
            'border-r border-gray-200 transform transition-transform duration-300 ease-in-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="h-full flex flex-col">
          {/* Header - Mobile only */}
          <div className="lg:hidden flex items-center justify-between p-4 border-b">
            <h2 className="font-semibold">Store Menu</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Quick Stats */}
          <div className="p-4 border-b bg-gray-50">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-3 rounded-lg border">
                <p className="text-xs text-gray-500">Products</p>
                <p className="text-lg font-semibold">24</p>
              </div>
              <div className="bg-white p-3 rounded-lg border">
                <p className="text-xs text-gray-500">Orders</p>
                <p className="text-lg font-semibold">156</p>
              </div>
            </div>
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
                    'flex items-center justify-between ' +
                      'gap-3 px-3 py-2 rounded-lg transition-colors',
                    isActive
                      ? 'bg-primary text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={cn(
                        'text-xs px-2 py-0.5 rounded-full',
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-primary text-white'
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
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
