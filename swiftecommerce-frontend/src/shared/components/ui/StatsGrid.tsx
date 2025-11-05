import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from './Card';

interface StatItem {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: string;
  bgColor?: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
}

interface StatsGridProps {
  stats: StatItem[];
  columns?: 2 | 3 | 4;
}

export function StatsGrid({ stats, columns = 4 }: StatsGridProps) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-${columns} gap-4`}>
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {stat.value}
                  </p>
                  {stat.change && (
                    <p
                      className={`text-xs mt-1 ${
                        stat.trend === 'up' ? 'text-success' : 'text-error'
                      }`}
                    >
                      {stat.change}
                    </p>
                  )}
                </div>
                <div
                  className={`h-12 w-12 ${stat.bgColor || 'bg-primary/10'} rounded-lg flex items-center justify-center`}
                >
                  <Icon className={`h-6 w-6 ${stat.color || 'text-primary'}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
