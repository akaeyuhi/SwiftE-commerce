import { Link } from '@/shared/components/ui/Link';
import { useLocation } from 'react-router-dom';
import { ROUTES } from '@/app/routes/routes';
import { useUI } from '@/app/store';
import { cn } from '@/shared/utils/cn';
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
          'fixed lg:static inset-y-0 left-0 z-50 w-64 bg-card border-r border-border',
          'transform transition-transform duration-300 ease-in-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="h-full flex flex-col">
          {/* Header - Mobile only */}
          <div className="lg:hidden flex items-center justify-between p-4 border-b border-border">
            <h2 className="font-semibold text-foreground">Store Menu</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-foreground" />
            </button>
          </div>

          {/* Quick Stats */}
          <div className="p-4 border-b border-border bg-muted/50">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card p-3 rounded-lg border border-border">
                <p className="text-xs text-muted-foreground">Products</p>
                <p className="text-lg font-semibold text-foreground">24</p>
              </div>
              <div className="bg-card p-3 rounded-lg border border-border">
                <p className="text-xs text-muted-foreground">Orders</p>
                <p className="text-lg font-semibold text-foreground">156</p>
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
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
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
                          ? 'bg-primary-foreground/20 text-primary-foreground'
                          : 'bg-primary text-primary-foreground'
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
          <div className="p-4 border-t border-border space-y-1">
            {bottomNavigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
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
