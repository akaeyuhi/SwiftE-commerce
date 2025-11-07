import { useParams } from 'react-router-dom';
import { ErrorBoundary } from '@/shared/components/errors/ErrorBoundary';
import { QueryLoader } from '@/shared/components/loaders/QueryLoader';
import { useStoreOverview } from '../hooks/useStoreOverview';
import { StoreOverviewHeader } from '../components/StoreOverviewHeader';
import { StoreStatsGrid } from '../components/StoreStatsGrid';
import { RecentOrders } from '../components/RecentOrders';
import { TopProducts } from '../components/TopProducts';
import { QuickActions } from '../components/QuickActions';
import { StoreHealth } from '../components/StoreHealth';
import { useNavigate } from '@/shared/hooks/useNavigate.ts';
import { ROUTES } from '@/app/routes/routes.ts';

export function StoreOverviewPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();

  if (!storeId) {
    navigate.to(ROUTES.NOT_FOUND);
    return null;
  }

  const {
    data: overviewData,
    isLoading: overviewLoading,
    error: overviewError,
    refetch: refetchOverview,
    isFetching: overviewFetching,
  } = useStoreOverview(storeId!);

  return (
    <ErrorBoundary title="Store Overview Error">
      <div className="space-y-6">
        <StoreOverviewHeader />

        <QueryLoader
          isLoading={overviewLoading}
          isFetching={overviewFetching}
          error={overviewError}
          refetch={refetchOverview}
          errorTitle="Failed to load statistics"
          loadingMessage="Loading store statistics..."
          showOverlayOnRefetch={true}
        >
          {overviewData && <StoreStatsGrid overviewData={overviewData} />}
        </QueryLoader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentOrders storeId={storeId} />
          <TopProducts storeId={storeId} />
        </div>

        <QuickActions />

        <StoreHealth storeId={storeId} />
      </div>
    </ErrorBoundary>
  );
}
