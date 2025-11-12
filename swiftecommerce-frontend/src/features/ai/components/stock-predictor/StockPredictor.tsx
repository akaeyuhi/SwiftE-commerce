import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { usePredictDemand } from 'src/features/ai/hooks/useAi.ts';
import { StockPredictorForm } from 'src/features/ai/components/stock-predictor/StockPredictorForm.tsx';
import { StockPredictorResult } from 'src/features/ai/components/stock-predictor/StockPredictorResult.tsx';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/Card.tsx';
import { Sparkles } from 'lucide-react';
import { QueryLoader } from '@/shared/components/loaders/QueryLoader.tsx';

export function StockPredictor() {
  const { storeId } = useParams<{ storeId: string }>();
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [result, setResult] = useState<any | null>(null);

  const predictDemand = usePredictDemand(storeId!);

  const handlePredict = async () => {
    if (!selectedProductId) {
      toast.error('Please select a product');
      return;
    }

    setResult(null);

    try {
      const generatedResult = await predictDemand.mutateAsync({
        productId: selectedProductId,
      });
      setResult(generatedResult);
      toast.success('Prediction complete!');
    } catch (error) {
      toast.error(`Failed to predict demand: ${error}`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Stock Outage Predictor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <StockPredictorForm
          selectedProductId={selectedProductId}
          setSelectedProductId={setSelectedProductId}
          handlePredict={handlePredict}
          isLoading={predictDemand.isPending}
        />
        <QueryLoader
          isLoading={predictDemand.isPending}
          error={predictDemand.error}
          refetch={handlePredict}
        >
          {result && <StockPredictorResult result={result} />}
        </QueryLoader>
      </CardContent>
    </Card>
  );
}
