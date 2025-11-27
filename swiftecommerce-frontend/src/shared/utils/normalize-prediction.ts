import {
  NormalizedPrediction,
  PredictionResponse,
} from '@/features/ai/types/ai-predictor.types.ts';

export function normalizePredictionData(
  response: PredictionResponse
): NormalizedPrediction[] {
  return response.data.prediction.map((pred) => {
    const {
      score,
      label,
      features,
      productId,
      storeId,
      history,
      forecastP50, // Expected demand (14-day sum from TFT)
      forecastP90, // High confidence demand (14-day sum from TFT)
      confidence, // Confidence score from TFT (0-1)
    } = pred;

    // 1. Determine Inventory Level
    let inventoryQty = features?.inventoryQty ?? 0;

    if (history && history.length > 0) {
      const sortedHistory = [...history].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      const lastRecord = sortedHistory[sortedHistory.length - 1];
      if (lastRecord) {
        inventoryQty = lastRecord.inventoryQty;
      }
    }

    // 2. Determine Daily Demand Rate
    let dailyDemand = 0;
    if (typeof forecastP50 === 'number') {
      dailyDemand = forecastP50 / 14;
    } else if (features?.sales30dPerDay) {
      dailyDemand = features.sales30dPerDay;
    }

    // 3. Calculate Metrics
    const riskPercentage = Math.round(score * 100);

    // Use model confidence if available (convert 0-1 to 0-100), else fallback to risk inversion
    const mappedConfidence =
      typeof confidence === 'number'
        ? Math.round(confidence * 100)
        : 100 - Math.round(score * 100);

    const predictedDemand = Math.round(dailyDemand);

    let peakDemand: number | undefined;
    if (typeof forecastP90 === 'number') {
      peakDemand = Math.round(forecastP90 / 14);
    }

    // Days Until Stockout
    let daysUntilStockout: number | null = null;

    // FIX: Check for > 0.01 to avoid dividing by model noise (e.g., 1e-22)
    // which results in massive numbers like 8.8e+22
    if (dailyDemand > 0.01) {
      daysUntilStockout = Math.floor(inventoryQty / dailyDemand);
    } else if (inventoryQty === 0) {
      daysUntilStockout = 0;
    }

    // Recommended Reorder Quantity
    const reorderDemandRate =
      typeof forecastP90 === 'number' ? forecastP90 / 14 : dailyDemand;

    const safetyDays = label === 'critical' ? 30 : label === 'high' ? 21 : 14;

    const recommendedReorder = Math.max(
      0,
      Math.ceil(reorderDemandRate * safetyDays - inventoryQty)
    );

    return {
      productId,
      storeId,
      stockoutRisk: label,
      riskScore: score,
      riskPercentage,
      confidence: mappedConfidence,
      inventoryLevel: inventoryQty,
      predictedDemand,
      peakDemand,
      recommendedReorder,
      daysUntilStockout,
      features: features || {},
      history,
      processedAt: new Date(response.data.metadata.processedAt),
    };
  });
}
