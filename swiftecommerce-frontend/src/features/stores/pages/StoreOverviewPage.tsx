import { useParams } from 'react-router-dom';
import { ErrorBoundary } from '@/shared/components/errors/ErrorBoundary';
import { QueryLoader } from '@/shared/components/loaders/QueryLoader';
import { useStoreOverview } from '../hooks/useStoreOverview';
import { StoreOverviewHeader } from '../components/header/StoreOverviewHeader';
import { StoreStatsGrid } from '../components/stats/StoreStatsGrid';
import { RecentOrders } from '../components/stats/RecentOrders';
import { TopProducts } from '../components/stats/TopProducts';
import { QuickActions } from '../components/misc/QuickActions';
import { StoreHealth } from '../components/stats/StoreHealth';
import { useNavigate } from '@/shared/hooks/useNavigate.ts';
import { ROUTES } from '@/app/routes/routes.ts';

export function StoreOverviewPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();

  const {
    data: overviewData,
    isLoading: overviewLoading,
    error: overviewError,
    refetch: refetchOverview,
    isFetching: overviewFetching,
  } = useStoreOverview(storeId!);

  if (!storeId) {
    navigate.to(ROUTES.NOT_FOUND);
    return null;
  }

  console.log(overviewData);

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
          <RecentOrders
            storeId={storeId}
            error={overviewError}
            isLoading={overviewLoading}
            orders={overviewData?.recentOrders as any}
          />
          <TopProducts
            error={overviewError}
            isLoading={overviewLoading}
            products={overviewData?.topProducts as any}
          />
        </div>

        <QuickActions storeId={storeId} />

        <StoreHealth storeId={storeId} />
      </div>
    </ErrorBoundary>
  );
}
