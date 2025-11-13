import { useState } from 'react';
import { AnalyticsHeader } from '../components/AnalyticsHeader';
import { StatsCards } from '../components/StatsCards';
import { RevenueChart } from '../components/RevenueChart';
import { CategorySalesChart } from '../components/CategorySalesChart';
import { TopProductsList } from '../components/TopProductsList';
import { StoreInsights } from '../components/StoreInsights';
import { ErrorBoundary } from '@/shared/components/errors/ErrorBoundary';
import { TimePeriod } from '@/features/analytics/types/analytics.types.ts';

export function StoreAnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimePeriod>('month' as TimePeriod);

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <AnalyticsHeader
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
        />
        <StatsCards timeRange={timeRange} />
        <RevenueChart timeRange={timeRange} />
        <CategorySalesChart timeRange={timeRange} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TopProductsList timeRange={timeRange} />
          <StoreInsights timeRange={timeRange} />
        </div>
      </div>
    </ErrorBoundary>
  );
}
