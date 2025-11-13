import { useMemo } from 'react';
import { useAuth } from '@/app/store';
import { useLikes } from '@/features/likes/hooks/useLikes';
import { QueryLoader } from '@/shared/components/loaders/QueryLoader';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { Store } from 'lucide-react';
import { Card } from '@/shared/components/ui/Card';
import { FollowedStoreCard } from './FollowedStoreCard';

export function FollowedStoresTab() {
  const { user } = useAuth();
  const { data: likes, isLoading, error } = useLikes(user!.id);

  const followedStores = useMemo(
    () => likes?.filter((like) => !!like.store) || [],
    [likes]
  );

  return (
    <QueryLoader isLoading={isLoading} error={error}>
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
          {followedStores.map((like) => (
            <FollowedStoreCard key={like.id} like={like} />
          ))}
        </div>
      )}
    </QueryLoader>
  );
}
