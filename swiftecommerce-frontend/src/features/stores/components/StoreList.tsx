import { Store } from '../pages/MyStoresPage';
import { StoreCard } from './StoreCard';

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
