import { useMemo } from 'react';
import { Card } from '@/shared/components/ui/Card';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { useNavigate } from '@/shared/hooks/useNavigate';
import { Heart } from 'lucide-react';
import { useAuth } from '@/app/store';
import { useLikes } from '@/features/likes/hooks/useLikes';
import { QueryLoader } from '@/shared/components/loaders/QueryLoader';
import { WishlistProductCard } from '../components/wishlist/WishlistProductCard';

export function WishlistPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const {
    data: likes,
    isLoading,
    error,
  } = useLikes(user!.id, {
    enabled: isAuthenticated,
  });

  const wishlistItems = useMemo(
    () => likes?.filter((like) => !!like.product) || [],
    [likes]
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            My Wishlist
          </h1>
          <p className="text-muted-foreground">
            {wishlistItems.length}{' '}
            {wishlistItems.length === 1 ? 'item' : 'items'} saved
          </p>
        </div>

        <QueryLoader
          isLoading={isLoading}
          error={error}
          loadingMessage="Loading your wishlist..."
        >
          {wishlistItems.length === 0 ? (
            <Card>
              <EmptyState
                icon={Heart}
                title="Your wishlist is empty"
                description="Start adding products you love to your wishlist"
                action={{
                  label: 'Browse Products',
                  onClick: () => navigate.toProducts(),
                }}
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {wishlistItems.map((like) => (
                <WishlistProductCard key={like.id} like={like} />
              ))}
            </div>
          )}
        </QueryLoader>
      </div>
    </div>
  );
}
