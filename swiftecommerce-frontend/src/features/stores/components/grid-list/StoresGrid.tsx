import { Card, CardContent } from '@/shared/components/ui/Card.tsx';
import {
  Heart,
  MapPin,
  Package,
  Star,
  Store as StoreIcon,
  TrendingUp,
} from 'lucide-react';
import { Badge } from '@/shared/components/ui/Badge.tsx';
import { Store } from '@/features/stores/pages/StoresPage.tsx';
import { useNavigate } from '@/shared/hooks/useNavigate.ts';

interface StoresGridProps {
  stores: Store[];
}

export const StoresGrid: React.FC<StoresGridProps> = ({ stores }) => {
  const navigate = useNavigate();
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {stores.map((store) => (
        <Card
          key={store.id}
          className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => navigate.to(`/stores/${store.id}`)}
        >
          <CardContent className="p-0">
            {/* Store Banner */}
            <div
              className="h-32 bg-gradient-to-br from-primary/20
                  to-primary/5 flex items-center justify-center relative"
            >
              {store.bannerUrl ? (
                <img
                  src={store.bannerUrl}
                  alt={store.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <StoreIcon className="h-12 w-12 text-primary/40" />
              )}
              <div className="absolute top-2 right-2">
                <Badge variant="success">Active</Badge>
              </div>
            </div>

            <div className="p-6">
              {/* Store Logo & Name */}
              <div className="flex items-start gap-4 mb-4">
                <div
                  className="h-16 w-16 rounded-lg bg-primary/10
                      flex items-center justify-center flex-shrink-0"
                >
                  {store.logoUrl ? (
                    <img
                      src={store.logoUrl}
                      alt={store.name}
                      className="h-full w-full object-cover rounded-lg"
                    />
                  ) : (
                    <StoreIcon className="h-8 w-8 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-lg mb-1 truncate">
                    {store.name}
                  </h3>
                  {store.city && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {store.city}, {store.country}
                    </p>
                  )}
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {store.description}
              </p>

              {/* Store Stats */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Products</p>
                    <p className="font-semibold text-foreground">
                      {store.totalProducts}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Sales</p>
                    <p className="font-semibold text-foreground">
                      {store.totalSales}
                    </p>
                  </div>
                </div>
              </div>

              {/* Rating & Followers */}
              <div className="flex items-center justify-between pt-4 border-t border-border">
                {store.averageRating && (
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-warning text-warning" />
                    <span className="font-semibold text-foreground">
                      {store.averageRating.toFixed(1)}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Heart className="h-4 w-4" />
                  <span className="text-sm">{store.followersCount}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
