interface StockPredictorResultProps {
  result: any;
}

export function StockPredictorResult({ result }: StockPredictorResultProps) {
  return (
    <div>
      <h3 className="text-lg font-semibold">Prediction Result</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div>
          <p className="text-sm text-muted-foreground">Predicted Demand</p>
          <p className="text-2xl font-bold text-foreground">
            {result.predictedDemand}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Stockout Risk</p>
          <p className="text-2xl font-bold text-foreground">
            {result.stockoutRisk}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Recommended Reorder</p>
          <p className="text-2xl font-bold text-foreground">
            {result.recommendedReorder}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Confidence</p>
          <p className="text-2xl font-bold text-foreground">
            {result.confidence}
          </p>
        </div>
      </div>
    </div>
  );
}
