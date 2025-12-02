import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/Card';
import { useRevenueTrends } from '../hooks/useAnalytics';
import { useParams } from 'react-router-dom';
import { QueryLoader } from '@/shared/components/loaders/QueryLoader';
import { CustomTooltip } from './CustomTooltip';
import { TimePeriod } from '@/features/analytics/types/analytics.types.ts';
import { useMemo } from 'react';

export function RevenueChart({ timeRange }: { timeRange: TimePeriod }) {
  const { storeId } = useParams<{ storeId: string }>();
  const { data, isLoading, error, refetch } = useRevenueTrends(
    storeId!,
    timeRange
  );

  const chartData = useMemo(() => {
    if (!data) return [];

    return data.map((item: any) => ({
      ...item,
      date: new Date(item.date).toLocaleDateString(),
      orders: item.transactions || 0,
    }));
  }, [data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue & Orders Overview</CardTitle>
        <CardDescription>
          Revenue and order trends for the selected period
        </CardDescription>
      </CardHeader>
      <CardContent>
        <QueryLoader
          isLoading={isLoading}
          error={error}
          refetch={refetch}
          loadingMessage="Loading revenue trends..."
        >
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey="date"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis
                yAxisId="left"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))' }}
                name="Revenue ($)"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="orders"
                stroke="hsl(var(--success))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--success))' }}
                name="Orders"
              />
            </LineChart>
          </ResponsiveContainer>
        </QueryLoader>
      </CardContent>
    </Card>
  );
}
