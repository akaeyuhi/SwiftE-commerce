import { useAuth } from '@/app/store';
import { StatsGrid } from '@/shared/components/ui/StatsGrid';
import { Heart, ShoppingCart, Star, Store } from 'lucide-react';
import { useMemo } from 'react';
import { useUserProfileStats } from '../../hooks/useUsers';

export function ProfileStatsGrid() {
  const { user } = useAuth();
  const { data: statsData, isLoading } = useUserProfileStats({
    enabled: !!user,
  });

  const stats = useMemo(() => {
    if (!statsData) return [];
    return [
      {
        title: 'Total Orders',
        value: statsData.totalOrders,
        icon: ShoppingCart,
        color: 'text-primary',
        bgColor: 'bg-primary/10',
      },
      {
        title: 'Liked Products',
        value: statsData.likedProducts,
        icon: Heart,
        color: 'text-error',
        bgColor: 'bg-error/10',
      },
      {
        title: 'Followed Stores',
        value: statsData.followedStores,
        icon: Store,
        color: 'text-info',
        bgColor: 'bg-info/10',
      },
      {
        title: 'Reviews Written',
        value: statsData.reviewsWritten,
        icon: Star,
        color: 'text-warning',
        bgColor: 'bg-warning/10',
      },
    ];
  }, [statsData]);

  if (isLoading) {
    return (
      <div className="mb-8">
        <StatsGrid
          stats={[...Array(4)].map(() => ({
            title: '',
            value: '',
            icon: Heart,
          }))}
          columns={4}
        />
      </div>
    );
  }

  return (
    <div className="mb-8">
      <StatsGrid stats={stats} columns={4} />
    </div>
  );
}
