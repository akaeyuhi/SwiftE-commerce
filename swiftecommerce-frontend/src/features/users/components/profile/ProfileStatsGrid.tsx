import { useAuth } from '@/app/store';
import { useLikes } from '@/features/likes/hooks/useLikes';
import { useOrders } from '@/features/orders/hooks/useOrders';
import { StatsGrid } from '@/shared/components/ui/StatsGrid';
import { Heart, ShoppingCart, Star, Store } from 'lucide-react';
import { useMemo } from 'react';

export function ProfileStatsGrid() {
  const { user } = useAuth();
  // TODO: This fetches all orders for a specific store, but we need all orders for a user
  // This is a limitation of the current API design. For now, we'll show 0.
  const { data: orders } = useOrders('all-stores', user!.id, { enabled: false });
  const { data: likes } = useLikes(user!.id, { enabled: !!user });
  // TODO: Need a hook to fetch user's reviews count. For now, we'll show 0.

  const stats = useMemo(() => {
    const likedProductsCount = likes?.filter((l) => l.productId).length || 0;
    const followedStoresCount = likes?.filter((l) => l.storeId).length || 0;

    return [
      {
        title: 'Total Orders',
        value: orders?.pages[0].meta.total ?? 0,
        icon: ShoppingCart,
        color: 'text-primary',
        bgColor: 'bg-primary/10',
      },
      {
        title: 'Liked Products',
        value: likedProductsCount,
        icon: Heart,
        color: 'text-error',
        bgColor: 'bg-error/10',
      },
      {
        title: 'Followed Stores',
        value: followedStoresCount,
        icon: Store,
        color: 'text-info',
        bgColor: 'bg-info/10',
      },
      {
        title: 'Reviews Written',
        value: 0, // Mocked for now
        icon: Star,
        color: 'text-warning',
        bgColor: 'bg-warning/10',
      },
    ];
  }, [likes, orders]);

  return (
    <div className="mb-8">
      <StatsGrid stats={stats} columns={4} />
    </div>
  );
}
