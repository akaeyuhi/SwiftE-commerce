import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/Card';
import { useStoreHealth } from '../hooks/useStores';
import { SkeletonLoader } from '@/shared/components/loaders/SkeletonLoader';

interface StoreHealthProps {
  storeId: string;
}

export function StoreHealth({ storeId }: StoreHealthProps) {
  const { data: storeHealth, isLoading: healthLoading } = useStoreHealth(storeId!);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Store Health</CardTitle>
        <CardDescription>Current status and metrics</CardDescription>
      </CardHeader>
      <CardContent>
        {healthLoading ? (
          <SkeletonLoader variant="grid" columns={3} count={3} />
        ) : storeHealth ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {storeHealth.metrics &&
              Object.entries(storeHealth.metrics).map(
                ([key, value]: [string, any]) => (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground capitalize">
                        {key.replace(/([A-Z])/g, ' $1')}
                      </span>
                      <span className="text-sm font-medium text-foreground">
                        {typeof value === 'number' ? value.toFixed(2) : value}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-success transition-all"
                        style={{
                          width: `${Math.min(
                            typeof value === 'number' ? value : 0,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                )
              )}
          </div>
        ) : null}

        {storeHealth?.issues && storeHealth.issues.length > 0 && (
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-sm font-medium text-warning mb-3">
              Issues Detected:
            </p>
            <ul className="space-y-2">
              {storeHealth.issues.map((issue: string, idx: number) => (
                <li
                  key={idx}
                  className="text-sm text-muted-foreground flex gap-2"
                >
                  <span className="text-warning">•</span>
                  {issue}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
