import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/Card';
import {
  StockPredictionFeatures,
  DailyStat,
} from '@/features/ai/types/ai-predictor.types';
import { useMemo } from 'react';

interface PredictionFeaturesProps {
  features?: StockPredictionFeatures;
  history?: DailyStat[];
}

export function PredictionFeatures({
  features,
  history,
}: PredictionFeaturesProps) {
  const displayData = useMemo(() => {
    // 1. Prefer explicit features if populated (MLP Model)
    // We check sales30d to ensure it's not just an empty initialized object
    if (features && (features.sales30d > 0 || features.views30d > 0)) {
      return features;
    }

    // 2. Fallback: Derive features from History (TFT Model)
    if (history && history.length > 0) {
      // Sort chronological just in case
      const sorted = [...history].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      const sum = (arr: DailyStat[], key: keyof DailyStat) =>
        arr.reduce((acc, curr) => acc + (Number(curr[key]) || 0), 0);

      const last7 = sorted.slice(-7);
      const last14 = sorted.slice(-14);
      const last30 = sorted.slice(-30);
      const lastDay = sorted[sorted.length - 1];

      const sales30 = sum(last30, 'purchases');
      const rev30 = sum(last30, 'revenue');
      const avgPrice = sales30 > 0 ? rev30 / sales30 : 0;

      return {
        sales7d: sum(last7, 'purchases'),
        sales14d: sum(last14, 'purchases'),
        sales30d: sales30,
        views7d: sum(last7, 'views'),
        views30d: sum(last30, 'views'),
        addToCarts7d: 0, // Not available in standard history
        avgPrice,
        minPrice: avgPrice,
        maxPrice: avgPrice,
        avgRating: 0,
        ratingCount: 0,
        inventoryQty: lastDay?.inventoryQty || 0,
        daysSinceRestock: 0,
      } as StockPredictionFeatures;
    }

    // 3. Empty Default
    return (features || {
      sales7d: 0,
      sales14d: 0,
      sales30d: 0,
      views7d: 0,
      views30d: 0,
      addToCarts7d: 0,
      avgPrice: 0,
      minPrice: 0,
      maxPrice: 0,
      avgRating: 0,
      ratingCount: 0,
      daysSinceRestock: 0,
      inventoryQty: 0,
    }) as StockPredictionFeatures;
  }, [features, history]);

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-300 flex justify-between items-center">
          <span>Input Analysis</span>
          {history &&
            (!features ||
              (features.sales30d === 0 && features.views30d === 0)) && (
              <span
                className="text-[10px] font-normal text-blue-300 bg-blue-950/50
              px-2 py-0.5 rounded border border-blue-900"
              >
                Time-Series Data
              </span>
            )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-2">
          <FeatureItem label="Sales (7d)" value={displayData.sales7d} />
          <FeatureItem label="Sales (30d)" value={displayData.sales30d} />
          <FeatureItem label="Views (7d)" value={displayData.views7d} />
          <FeatureItem
            label="Avg Price"
            value={`$${displayData.avgPrice?.toFixed(2) || '0.00'}`}
          />
          <FeatureItem label="Inventory" value={displayData.inventoryQty} />
          <FeatureItem
            label="Conversion (30d)"
            value={
              displayData.views30d > 0
                ? `${((displayData.sales30d / displayData.views30d) * 100).toFixed(1)}%`
                : '0%'
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}

function FeatureItem({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div>
      <p className="text-gray-500 text-[10px] uppercase tracking-wider">
        {label}
      </p>
      <p className="font-medium text-gray-200 text-sm">{value}</p>
    </div>
  );
}
