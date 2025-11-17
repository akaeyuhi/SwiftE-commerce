import {
  NormalizedPrediction,
  PredictionResponse,
} from '@/features/ai/types/ai-predictor.types.ts';

export function normalizePredictionData(
  response: PredictionResponse
): NormalizedPrediction[] {
  return response.data.prediction.map((pred) => {
    const { score, label, features, productId, storeId } = pred;

    // Calculate risk percentage (score is 0-1, convert to 0-100)
    const riskPercentage = Math.round(score * 100);

    // Calculate confidence (higher score = higher confidence in prediction)
    const confidence = 100 - Math.round(score * 100);

    // Estimate predicted demand based on recent sales trends
    const predictedDemand = Math.round(features.sales30dPerDay);

    // Calculate days until stockout
    let daysUntilStockout: number | null = null;
    if (features.sales30dPerDay > 0) {
      daysUntilStockout = Math.floor(
        features.inventoryQty / features.sales30dPerDay
      );
    }

    // Calculate recommended reorder quantity
    const safetyDays = label === 'critical' ? 30 : label === 'high' ? 21 : 14;
    const recommendedReorder = Math.max(
      0,
      Math.ceil(features.sales30dPerDay * safetyDays - features.inventoryQty)
    );

    return {
      productId,
      storeId,
      stockoutRisk: label,
      riskScore: score,
      riskPercentage,
      confidence,
      inventoryLevel: features.inventoryQty,
      predictedDemand,
      recommendedReorder,
      daysUntilStockout,
      features,
      processedAt: new Date(response.data.metadata.processedAt),
    };
  });
}
