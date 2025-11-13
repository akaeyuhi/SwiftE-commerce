import { ErrorBoundary } from '@/shared/components/errors/ErrorBoundary';
import { DashboardHeader } from '../components/DashboardHeader';
import { DashboardStats } from '../components/DashboardStats';
import { MyStores } from '../components/MyStores';
import { QuickActions } from '../components/QuickActions';
import { RecentOrders } from '../components/RecentOrders';

export function DashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <ErrorBoundary>
          <DashboardHeader />
          <DashboardStats />
          <QuickActions />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RecentOrders />
            <MyStores />
          </div>
        </ErrorBoundary>
      </div>
    </div>
  );
}
