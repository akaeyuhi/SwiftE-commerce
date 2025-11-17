import { Card, CardContent } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { Package, TrendingUp, Calendar, Box } from 'lucide-react';
import { NormalizedPrediction } from '@/features/ai/types/ai-predictor.types.ts';
import { ProgressBar } from '@/features/ai/components/stock-predictor/ProgressBar.tsx';

interface StockPredictionCardProps {
  prediction: NormalizedPrediction;
}

export function StockPredictionCard({ prediction }: StockPredictionCardProps) {
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'critical':
        return 'bg-red-500 text-white';
      case 'high':
        return 'bg-orange-500 text-white';
      case 'medium':
        return 'bg-yellow-500 text-white';
      case 'low':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getRiskBarColor = (risk: string) => {
    switch (risk) {
      case 'critical':
        return 'red';
      case 'high':
        return 'orange';
      case 'medium':
        return 'yellow';
      case 'low':
        return 'green';
      default:
        return 'gray';
    }
  };

  console.log(prediction);

  return (
    <Card className="bg-gray-950 border-gray-800">
      <CardContent className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">
              Product ID: {prediction.productId.slice(0, 8)}...
            </p>
          </div>
          <Badge className={getRiskColor(prediction.stockoutRisk)}>
            <Package className="h-3 w-3 mr-1" />
            {prediction.stockoutRisk} Risk
          </Badge>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-4 gap-4">
          <MetricCard
            icon={<Box className="h-4 w-4 text-blue-400" />}
            label="Current Inventory"
            value={prediction.inventoryLevel.toString()}
          />
          <MetricCard
            icon={<TrendingUp className="h-4 w-4 text-purple-400" />}
            label="Daily Demand"
            value={prediction.predictedDemand.toString()}
          />
          <MetricCard
            icon={<Package className="h-4 w-4 text-orange-400" />}
            label="Reorder Qty"
            value={prediction.recommendedReorder.toString()}
          />
          <MetricCard
            icon={<Calendar className="h-4 w-4 text-green-400" />}
            label="Days to Stockout"
            value={prediction.daysUntilStockout?.toString() || '∞'}
          />
        </div>

        {/* Progress Bars */}
        <div className="space-y-4">
          <ProgressBar
            label="Stockout Risk"
            value={prediction.riskPercentage}
            color={getRiskBarColor(prediction.stockoutRisk)}
          />

          <ProgressBar
            label="Prediction Confidence"
            value={prediction.confidence}
            color="blue"
            showLabel={false}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-gray-400">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}
