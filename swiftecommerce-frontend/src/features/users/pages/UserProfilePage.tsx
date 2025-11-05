import { useState, useMemo } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { StatsGrid } from '@/shared/components/ui/StatsGrid';
import { useAuth, useCart, useWishlist } from '@/app/store'; // Add useWishlist
import {
  User,
  Heart,
  Store,
  ShoppingCart,
  Package,
  Star,
  Settings,
} from 'lucide-react';
import { mockProducts } from '@/shared/mocks/products.mock';
import { mockStores } from '@/shared/mocks/stores.mock';
import { useNavigate } from '@/shared/hooks/useNavigate.ts';
import { buildRoute } from '@/app/routes/routes.ts';
import { Link } from '@/shared/components/ui/Link.tsx';
import { Product } from '@/features/products/types/product.types.ts';
import { toast } from 'sonner';

export function UserProfilePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'liked' | 'stores'>('liked');
  const navigate = useNavigate();
  const { addItem } = useCart();

  const {
    likedProductIds,
    followedStoreIds,
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
    followStore,
    unfollowStore,
    isFollowingStore,
  } = useWishlist();

  // Filter products based on liked IDs
  const likedProducts = useMemo(
    () =>
      mockProducts.filter((product) => likedProductIds.includes(product.id)),
    [likedProductIds]
  );

  // Filter stores based on followed IDs
  const followedStores = useMemo(
    () => mockStores.filter((store) => followedStoreIds.includes(store.id)),
    [followedStoreIds]
  );

  const stats = [
    {
      title: 'Total Orders',
      value: 12,
      icon: ShoppingCart,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Liked Products',
      value: likedProducts.length,
      icon: Heart,
      color: 'text-error',
      bgColor: 'bg-error/10',
    },
    {
      title: 'Followed Stores',
      value: followedStores.length,
      icon: Store,
      color: 'text-info',
      bgColor: 'bg-info/10',
    },
    {
      title: 'Reviews Written',
      value: 8,
      icon: Star,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
  ];

  const handleAddToCart = async (product: Product) => {
    addItem(product as any);
    toast.success('Added to cart!');
  };

  const handleToggleFavorite = async (productId: string) => {
    if (isInWishlist(productId)) {
      removeFromWishlist(productId);
      toast.success('Removed from favorites');
    } else {
      addToWishlist(productId);
      toast.success('Added to favorites');
    }
  };

  const handleToggleFollowStore = async (storeId: string) => {
    if (isFollowingStore(storeId)) {
      unfollowStore(storeId);
      toast.success('Unfollowed store');
    } else {
      followStore(storeId);
      toast.success('Following store');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              {/* Avatar */}
              <div
                className="h-24 w-24 rounded-full bg-primary/10 flex
              items-center justify-center flex-shrink-0"
              >
                <User className="h-12 w-12 text-primary" />
              </div>

              {/* Info */}
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  {user?.firstName} {user?.lastName}
                </h1>
                <p className="text-muted-foreground mb-3">{user?.email}</p>
                <div className="flex gap-2">
                  <Badge variant="default">
                    {user?.siteRole === 'SITE_ADMIN' ? 'Admin' : 'User'}
                  </Badge>
                  {user?.isEmailVerified && (
                    <Badge variant="success">Email Verified</Badge>
                  )}
                </div>
              </div>

              {/* Actions */}
              <Button
                variant="outline"
                onClick={() => navigate.to(`/settings`)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Profile settings
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="mb-8">
          <StatsGrid stats={stats} columns={4} />
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <Button
            variant={activeTab === 'liked' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('liked')}
          >
            <Heart className="h-4 w-4 mr-2" />
            Liked Products ({likedProducts.length})
          </Button>
          <Button
            variant={activeTab === 'stores' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('stores')}
          >
            <Store className="h-4 w-4 mr-2" />
            Followed Stores ({followedStores.length})
          </Button>
        </div>

        {/* Liked Products */}
        {activeTab === 'liked' && (
          <div>
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
                {likedProducts.map((product) => (
                  <Card
                    key={product.id}
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                  >
                    <CardContent className="p-0">
                      {/* Image */}
                      <Link to={buildRoute.productDetail(product.id)}>
                        <div className="aspect-square bg-muted flex items-center justify-center">
                          <Package className="h-12 w-12 text-muted-foreground" />
                        </div>
                      </Link>

                      <div className="p-4">
                        <Link to={buildRoute.productDetail(product.id)}>
                          <h3 className="font-semibold text-foreground mb-2">
                            {product.name}
                          </h3>
                        </Link>

                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {product.description}
                        </p>

                        {/* Price */}
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-lg font-bold text-foreground">
                            $
                            {Math.min(
                              ...product.variants.map((v) => v.price)
                            ).toFixed(2)}
                          </p>
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-warning text-warning" />
                            <span className="text-sm font-medium">
                              {product.averageRating}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => handleAddToCart(product as any)}
                          >
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            Add to Cart
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleFavorite(product.id)}
                          >
                            <Heart
                              className={`h-4 w-4 ${
                                isInWishlist(product.id)
                                  ? 'fill-error text-error'
                                  : ''
                              }`}
                            />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Followed Stores */}
        {activeTab === 'stores' && (
          <div>
            {followedStores.length === 0 ? (
              <Card>
                <EmptyState
                  icon={Store}
                  title="No followed stores"
                  description="Start following stores to see them here"
                />
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {followedStores.map((store) => (
                  <Card
                    key={store.id}
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4 mb-4">
                        <div
                          className="h-16 w-16 bg-primary/10 rounded-lg flex
                        items-center justify-center flex-shrink-0"
                        >
                          <Store className="h-8 w-8 text-primary" />
                        </div>
                        <div className="flex-1">
                          <Link to={buildRoute.storePublic(store.id)}>
                            <h3 className="font-semibold text-foreground mb-1">
                              {store.name}
                            </h3>
                          </Link>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {store.description}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="text-center">
                          <p className="text-lg font-bold text-foreground">
                            {store.totalProducts}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Products
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-foreground">
                            {store.averageRating}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Rating
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-foreground">
                            {store.followersCount}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Followers
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => navigate.toStorePublic(store.id)}
                        >
                          Visit Store
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleFollowStore(store.id)}
                        >
                          <Heart
                            className={`h-4 w-4 ${
                              isFollowingStore(store.id)
                                ? 'fill-error text-error'
                                : ''
                            }`}
                          />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
