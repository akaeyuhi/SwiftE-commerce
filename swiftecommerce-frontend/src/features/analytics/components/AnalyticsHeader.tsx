import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { TimePeriod } from '@/features/analytics/types/analytics.types.ts';

interface AnalyticsHeaderProps {
  timeRange: TimePeriod;
  onTimeRangeChange: (value: TimePeriod) => void;
}

export function AnalyticsHeader({
  timeRange,
  onTimeRangeChange,
}: AnalyticsHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Analytics</h1>
        <p className="text-muted-foreground">
          Track your store performance and insights
        </p>
      </div>
      <Select value={timeRange} onValueChange={onTimeRangeChange}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="dat">Last day</SelectItem>
          <SelectItem value="week">Last week</SelectItem>
          <SelectItem value="month">Last month</SelectItem>
          <SelectItem value="year">Last year</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
