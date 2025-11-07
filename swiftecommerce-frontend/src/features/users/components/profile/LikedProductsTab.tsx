import { useMemo } from 'react';
import { useAuth } from '@/app/store';
import { useLikes } from '@/features/likes/hooks/useLikes';
import { QueryLoader } from '@/shared/components/loaders/QueryLoader';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { Heart } from 'lucide-react';
import { Card } from '@/shared/components/ui/Card';
import { WishlistProductCard } from '../wishlist/WishlistProductCard';

export function LikedProductsTab() {
  const { user } = useAuth();
  const { data: likes, isLoading, error } = useLikes(user!.id);

  const likedProducts = useMemo(() => likes?.filter((like) => !!like.product) || [], [likes]);

  return (
    <QueryLoader isLoading={isLoading} error={error}>
      {likedProducts.length === 0 ? (
        <Card>
          <EmptyState
            icon={Heart}
            title="No liked products"
            description="Start liking products to see them here"
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {likedProducts.map((like) => (
            <WishlistProductCard key={like.id} like={like} />
          ))}
        </div>
      )}
    </QueryLoader>
  );
}
