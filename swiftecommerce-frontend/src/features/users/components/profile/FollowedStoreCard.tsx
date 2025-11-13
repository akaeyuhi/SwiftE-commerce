import { Link } from '@/shared/components/ui/Link';
import { Button } from '@/shared/components/ui/Button';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { buildRoute } from '@/app/routes/routes';
import { Like } from '@/features/likes/types/likes.types';
import { useLikeMutations } from '@/features/likes/hooks/useLikes';
import { useAuth } from '@/app/store';
import { useNavigate } from '@/shared/hooks/useNavigate';
import { Store, Heart } from 'lucide-react';

interface FollowedStoreCardProps {
  like: Like;
}

export function FollowedStoreCard({ like }: FollowedStoreCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { removeLike } = useLikeMutations(user!.id);

  const store = like.store;

  if (!store) {
    return null;
  }

  const handleUnfollow = () => {
    removeLike.mutate(like.id);
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start gap-4 mb-4">
          <div
            className="h-16 w-16 bg-primary/10 rounded-lg flex
            items-center justify-center flex-shrink-0"
          >
            {store.logoUrl ? (
              <img
                src={store.logoUrl}
                alt={store.name}
                className="h-full w-full object-cover rounded-lg"
              />
            ) : (
              <Store className="h-8 w-8 text-primary" />
            )}
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
              {store.productCount || 0}
            </p>
            <p className="text-xs text-muted-foreground">Products</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">
              {store.orderCount?.toFixed(1) || 'N/A'}
            </p>
            <p className="text-xs text-muted-foreground">Orders</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">
              {store.followerCount || 0}
            </p>
            <p className="text-xs text-muted-foreground">Followers</p>
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
          <Button variant="outline" size="sm" onClick={handleUnfollow}>
            <Heart className={'h-4 w-4 fill-error text-error'} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
