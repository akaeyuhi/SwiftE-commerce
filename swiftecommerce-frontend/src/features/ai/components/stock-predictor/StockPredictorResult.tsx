import { NormalizedPrediction } from '@/features/ai/types/ai-predictor.types.ts';
import { StockPredictionCard } from '@/features/ai/components/stock-predictor/StockPredictionCard.tsx';
import { PredictionFeatures } from '@/features/ai/components/stock-predictor/PredictionFeatures.tsx';

export function StockPredictorResult({
  predictions,
}: {
  predictions: NormalizedPrediction[];
}) {
  const prediction = predictions[0]!;
  return (
    <>
      <StockPredictionCard prediction={prediction} />
      <PredictionFeatures features={prediction.features} />
    </>
  );
}
