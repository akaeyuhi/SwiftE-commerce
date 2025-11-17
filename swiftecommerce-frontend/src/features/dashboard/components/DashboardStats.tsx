import { ShoppingCart, Heart, Store, TrendingUp } from 'lucide-react';
import { useDashboardStats } from '../hooks/useDashboard';
import { QueryLoader } from '@/shared/components/loaders/QueryLoader';
import { StatsGrid } from '@/shared/components/ui/StatsGrid';
import { SkeletonLoader } from '@/shared/components/loaders/SkeletonLoader';
import { useAuth } from '@/app/store';

export function DashboardStats() {
  const { user } = useAuth();
  const { data, isLoading, error, refetch } = useDashboardStats(user!.id);

  console.log(data);

  const stats = data
    ? [
        {
          title: 'My Orders',
          value: data.orders?.length,
          icon: ShoppingCart,
          color: 'text-primary',
          bgColor: 'bg-primary/10',
        },
        {
          title: 'Wishlist',
          value: data.wishlist?.length,
          icon: Heart,
          color: 'text-error',
          bgColor: 'bg-error/10',
        },
        {
          title: 'My Stores',
          value: data.stores.length,
          icon: Store,
          color: 'text-info',
          bgColor: 'bg-info/10',
        },
        {
          title: 'Reviews',
          value: data.reviews?.length,
          icon: TrendingUp,
          color: 'text-success',
          bgColor: 'bg-success/10',
        },
      ]
    : [];

  if (isLoading) {
    return (
      <SkeletonLoader variant="grid" columns={4} count={4} height="h-24" />
    );
  }

  return (
    <QueryLoader isLoading={isLoading} error={error} refetch={refetch}>
      <StatsGrid stats={stats} columns={4} />
    </QueryLoader>
  );
}
