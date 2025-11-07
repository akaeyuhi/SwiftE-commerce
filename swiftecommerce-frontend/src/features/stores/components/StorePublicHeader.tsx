import { Card, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Store as StoreIcon, MapPin, Heart, Share2, Star, Package } from 'lucide-react';
import { StoreDto } from '../types/store.types';
import { formatCurrency, formatLargeNumber } from '@/shared/utils/statsCalculators';

interface StorePublicHeaderProps {
  store: StoreDto;
}

export function StorePublicHeader({ store }: StorePublicHeaderProps) {
  return (
    <div className="relative -mt-16 mb-8">
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Store Logo */}
            <div
              className="h-32 w-32 rounded-lg bg-card border-4
                      border-background shadow-lg
                      flex items-center justify-center flex-shrink-0"
            >
              {store.logoUrl ? (
                <img
                  src={store.logoUrl}
                  alt={store.name}
                  className="h-full w-full object-cover rounded-lg"
                />
              ) : (
                <StoreIcon className="h-16 w-16 text-primary" />
              )}
            </div>

            {/* Store Details */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-foreground mb-2">
                    {store.name}
                  </h1>
                  <p className="text-muted-foreground mb-2">
                    {store.description}
                  </p>
                  {store.city && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {store.city}, {store.country}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <Button size="sm">
                    <Heart className="h-4 w-4 mr-2" />
                    Follow
                  </Button>
                </div>
              </div>

              {/* Store Stats */}
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 fill-warning text-warning" />
                  <span className="font-semibold text-foreground">
                    {formatCurrency(store.totalRevenue, 'USD')} revenue
                  </span>
                  <span className="text-sm text-muted-foreground">
                    ({store.orderCount} orders)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-foreground">
                    {store.productCount} products
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-foreground">
                    {formatLargeNumber(store.followerCount)} followers
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
