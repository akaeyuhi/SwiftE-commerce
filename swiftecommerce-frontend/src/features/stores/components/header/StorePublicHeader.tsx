import { Store } from '@/features/stores/types/store.types';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import {
  Calendar,
  Package,
  Users,
  DollarSign,
  Heart,
  Share2,
  NewspaperIcon,
} from 'lucide-react';
import { format } from 'date-fns';
import { Link } from '@/shared/components/ui/Link';
import { ROUTES } from '@/app/routes/routes';
import { toast } from 'sonner';
import { buildUrl } from '@/config/api.config.ts';

interface StorePublicHeaderProps {
  store: Store;
  isFollowing: boolean;
  onFollowToggle: () => void;
  isFollowLoading: boolean;
  isAuthenticated: boolean;
}

export function StorePublicHeader({
  store,
  isFollowing,
  onFollowToggle,
  isFollowLoading,
  isAuthenticated,
}: StorePublicHeaderProps) {
  const handleShare = async () => {
    const storeUrl = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: store.name,
          text: `Check out ${store.name} on our platform`,
          url: storeUrl,
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Share failed:', error);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(storeUrl);
        toast.success('Store link copied to clipboard');
      } catch (error) {
        toast.error(`Failed to copy link: ${error}`);
      }
    }
  };

  return (
    <Card className="mt-[-4rem] relative z-10 mb-6">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Store Logo */}
          <div className="flex-shrink-0">
            {store.logoUrl ? (
              <img
                src={store.logoUrl}
                alt={store.name}
                className="w-24 h-24 rounded-lg object-cover border-2 border-border"
              />
            ) : (
              <div
                className="w-24 h-24 rounded-lg bg-muted border-2
              border-border flex items-center justify-center"
              >
                <span className="text-3xl font-bold text-muted-foreground">
                  {store.name[0]}
                </span>
              </div>
            )}
          </div>

          {/* Store Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  {store.name}
                </h1>
                <p className="text-muted-foreground">{store.description}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant={isFollowing ? 'primary' : 'outline'}
                  onClick={onFollowToggle}
                  disabled={isFollowLoading}
                  className="relative"
                >
                  <Heart
                    className={`h-4 w-4 mr-2 transition-all ${
                      isFollowing ? 'fill-current' : ''
                    }`}
                  />
                  {isFollowing ? 'Following' : 'Follow'}
                  {isFollowLoading && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span
                        className="animate-spin h-4 w-4
                      border-2 border-current border-t-transparent rounded-full"
                      />
                    </span>
                  )}
                </Button>

                <Link to={buildUrl(ROUTES.STORE_NEWS, { storeId: store.id })}>
                  <Button variant="outline" size="md">
                    <NewspaperIcon className="h-4 w-4 mr-2" />
                    News
                  </Button>
                </Link>

                <Button variant="outline" size="icon" onClick={handleShare}>
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Products</p>
                  <p className="text-sm font-semibold text-foreground">
                    {store.productCount || 0}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Followers</p>
                  <p className="text-sm font-semibold text-foreground">
                    {store.followerCount || 0}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Total Sales</p>
                  <p className="text-sm font-semibold text-foreground">
                    ${(store.totalRevenue || 0).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Joined</p>
                  <p className="text-sm font-semibold text-foreground">
                    {format(new Date(store.createdAt), 'MMM yyyy')}
                  </p>
                </div>
              </div>
            </div>

            {!isAuthenticated && (
              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  <Link
                    to={ROUTES.LOGIN}
                    className="text-primary hover:underline"
                  >
                    Sign in
                  </Link>{' '}
                  to follow this store and get updates on new products
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
