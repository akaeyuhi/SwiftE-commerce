import { useState } from 'react';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import {
  Package,
  TrendingUp,
  Calendar,
  Box,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { NormalizedPrediction } from '@/features/ai/types/ai-predictor.types';
import { ProgressBar } from '@/features/ai/components/stock-predictor/ProgressBar';
import { PredictionFeatures } from './PredictionFeatures';

interface StockPredictionCardProps {
  prediction: NormalizedPrediction;
}

export function StockPredictionCard({ prediction }: StockPredictionCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'critical':
        return 'bg-red-500/10 text-red-400 border-red-500/50 hover:bg-red-500/20';
      case 'high':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/50 hover:bg-orange-500/20';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/50 hover:bg-yellow-500/20';
      case 'low':
        return 'bg-green-500/10 text-green-400 border-green-500/50 hover:bg-green-500/20';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/50';
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

  // Format demand display (e.g. "5" or "5 - 8")
  // If demand is very low (e.g. < 0.1), show < 1
  const formatDemand = (val: number) =>
    val > 0 && val < 1 ? '< 1' : Math.round(val).toString();

  const demandDisplay =
    prediction.peakDemand &&
    prediction.peakDemand > prediction.predictedDemand &&
    Math.round(prediction.peakDemand) > Math.round(prediction.predictedDemand)
      ? `${formatDemand(prediction.predictedDemand)} - ${formatDemand(prediction.peakDemand)}`
      : formatDemand(prediction.predictedDemand);

  return (
    <Card
      className="bg-gray-950 border-gray-800 shadow-xl overflow-hidden
    transition-all duration-200 hover:border-gray-700"
    >
      <CardContent className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
                Product Analysis
              </p>
              <span className="text-gray-700">•</span>
              <span className="text-xs text-gray-500">
                {prediction.processedAt.toLocaleDateString()}
              </span>
            </div>
            <p
              className="text-sm text-gray-200 font-mono bg-gray-900 px-2 py-1
              rounded border border-gray-800 truncate w-48 select-all"
              title={prediction.productId}
            >
              {prediction.productId}
            </p>
          </div>
          <Badge
            className={`${getRiskColor(prediction.stockoutRisk)} px-3 py-1.5 shadow-sm border`}
          >
            {prediction.stockoutRisk === 'critical' ? (
              <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
            ) : (
              <Package className="h-3.5 w-3.5 mr-1.5" />
            )}
            <span className="capitalize font-medium">
              {prediction.stockoutRisk} Risk
            </span>
          </Badge>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            icon={<Box className="h-4 w-4 text-blue-400" />}
            label="Current Inventory"
            value={prediction.inventoryLevel.toString()}
            subValue="Units"
          />
          <MetricCard
            icon={<TrendingUp className="h-4 w-4 text-purple-400" />}
            label="Daily Demand"
            value={demandDisplay}
            subValue="Units / Day"
          />
          <MetricCard
            icon={<Package className="h-4 w-4 text-orange-400" />}
            label="Reorder Qty"
            value={prediction.recommendedReorder.toString()}
            subValue="Recommended"
          />
          <MetricCard
            icon={<Calendar className="h-4 w-4 text-green-400" />}
            label="Days to Stockout"
            value={prediction.daysUntilStockout?.toString() || '∞'}
            subValue="Estimated"
          />
        </div>

        {/* Progress Bars */}
        <div className="space-y-5 pt-2">
          <ProgressBar
            label="Stockout Probability"
            value={prediction.riskPercentage}
            color={getRiskBarColor(prediction.stockoutRisk)}
          />

          <ProgressBar
            label="Model Confidence"
            value={prediction.confidence}
            color="blue"
            showLabel={true}
          />
        </div>

        {/* Expandable Details */}
        <div className="pt-2 border-t border-gray-900">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-center
            text-gray-500 hover:text-gray-300 hover:bg-gray-900"
          >
            {showDetails ? (
              <>
                <ChevronUp className="h-4 w-4 mr-2" /> Hide Feature Details
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-2" /> Show Feature Details
              </>
            )}
          </Button>

          {showDetails && (
            <div className="mt-4 animate-in slide-in-from-top-2 fade-in duration-200">
              <PredictionFeatures
                features={prediction.features}
                history={prediction.history}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MetricCard({
  icon,
  label,
  value,
  subValue,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
}) {
  return (
    <div
      className="bg-gray-900/50 border border-gray-800 rounded-xl
    p-4 hover:border-gray-700 transition-colors group"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 bg-gray-800 rounded-md group-hover:bg-gray-700 transition-colors">
          {icon}
        </div>
        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">
          {label}
        </span>
      </div>
      <div className="space-y-0.5">
        <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
        {subValue && <p className="text-[10px] text-gray-500">{subValue}</p>}
      </div>
    </div>
  );
}
