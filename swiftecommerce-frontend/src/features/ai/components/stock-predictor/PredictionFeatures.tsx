import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/Card';
import { StockPredictionFeatures } from '@/features/ai/types/ai-predictor.types.ts';

interface PredictionFeaturesProps {
  features: StockPredictionFeatures;
}

export function PredictionFeatures({ features }: PredictionFeaturesProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Input Features</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <FeatureItem label="Sales (7d)" value={features.sales7d} />
          <FeatureItem label="Sales (14d)" value={features.sales14d} />
          <FeatureItem label="Sales (30d)" value={features.sales30d} />
          <FeatureItem label="Views (7d)" value={features.views7d} />
          <FeatureItem label="Views (30d)" value={features.views30d} />
          <FeatureItem label="Add to Cart (7d)" value={features.addToCarts7d} />
          <FeatureItem
            label="Avg Price"
            value={`$${features.avgPrice.toFixed(2)}`}
          />
          <FeatureItem
            label="Min Price"
            value={`$${features.minPrice.toFixed(2)}`}
          />
          <FeatureItem
            label="Max Price"
            value={`$${features.maxPrice.toFixed(2)}`}
          />
          <FeatureItem
            label="Avg Rating"
            value={features.avgRating.toFixed(1)}
          />
          <FeatureItem label="Reviews" value={features.ratingCount} />
          <FeatureItem
            label="Days Since Restock"
            value={features.daysSinceRestock}
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
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
