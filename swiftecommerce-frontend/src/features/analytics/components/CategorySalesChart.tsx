import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/Card';
import { useCategorySales } from '../hooks/useAnalytics';
import { useParams } from 'react-router-dom';
import { QueryLoader } from '@/shared/components/loaders/QueryLoader';
import { CustomTooltip } from './CustomTooltip';
import { TimePeriod } from '@/features/analytics/types/analytics.types.ts';

export function CategorySalesChart({ timeRange }: { timeRange: TimePeriod }) {
  const { storeId } = useParams<{ storeId: string }>();
  const {
    data: categoryData,
    isLoading,
    error,
    refetch,
  } = useCategorySales(storeId!, timeRange);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales by Category</CardTitle>
        <CardDescription>
          Revenue distribution across product categories
        </CardDescription>
      </CardHeader>
      <CardContent>
        <QueryLoader
          isLoading={isLoading}
          error={error}
          refetch={refetch}
          loadingMessage="Loading category sales..."
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey="name"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: 'hsl(var(--primary-foreground))' }}
              />
              <Bar
                dataKey="revenue"
                fill="hsl(var(--muted-foreground))"
                radius={[8, 8, 0, 0]}
                name="Revenue ($)"
              />
            </BarChart>
          </ResponsiveContainer>
        </QueryLoader>
      </CardContent>
    </Card>
  );
}
