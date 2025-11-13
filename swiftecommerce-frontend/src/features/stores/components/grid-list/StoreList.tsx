import { StoreCard } from '../card/StoreCard';
import { Store } from '@/features/stores/types/store.types.ts';

interface StoreListProps {
  stores: Store[];
}

export function StoreList({ stores }: StoreListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {stores.map((store) => (
        <StoreCard key={store.id} store={store} />
      ))}
    </div>
  );
}
