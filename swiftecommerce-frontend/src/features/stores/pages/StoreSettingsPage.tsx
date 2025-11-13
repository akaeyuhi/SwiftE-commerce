import { useParams } from 'react-router-dom';
import { useStore } from '@/features/stores/hooks/useStores.ts';
import { ErrorBoundary } from '@/shared/components/errors/ErrorBoundary';
import { QueryLoader } from '@/shared/components/loaders/QueryLoader';
import { StoreSettingsHeader } from '../components/header/StoreSettingsHeader';
import { StoreInfoForm } from '../components/form/StoreInfoForm';
import { StoreImagesForm } from '../components/form/StoreImagesForm';
import { StoreStats } from '../components/stats/StoreStats';
import { DangerZone } from '../components/misc/DangerZone';

export function StoreSettingsPage() {
  const params = useParams();
  const {
    data: currentStore,
    isLoading,
    error,
    refetch,
  } = useStore(params.storeId!);

  return (
    <ErrorBoundary title="Store Settings Error">
      <div className="space-y-6">
        <StoreSettingsHeader />
        <QueryLoader
          isLoading={isLoading}
          error={error}
          refetch={refetch}
          loadingMessage="Loading store settings..."
        >
          {currentStore && (
            <>
              <StoreInfoForm store={currentStore} />
              <StoreImagesForm store={currentStore} />
              <StoreStats store={currentStore} />
              <DangerZone storeId={currentStore.id} />
            </>
          )}
        </QueryLoader>
      </div>
    </ErrorBoundary>
  );
}
