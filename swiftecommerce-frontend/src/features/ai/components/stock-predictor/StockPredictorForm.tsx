import { Button } from '@/shared/components/ui/Button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Sparkles } from 'lucide-react';
import { mockProducts } from '@/shared/mocks/products.mock';

interface StockPredictorFormProps {
  selectedProductId: string;
  setSelectedProductId: (productId: string) => void;
  handlePredict: () => void;
  isLoading: boolean;
}

export function StockPredictorForm({
  selectedProductId,
  setSelectedProductId,
  handlePredict,
  isLoading,
}: StockPredictorFormProps) {
  return (
    <div>
      <label className="text-sm font-medium text-foreground mb-2 block">
        Select Product
      </label>
      <Select value={selectedProductId} onValueChange={setSelectedProductId}>
        <SelectTrigger>
          <SelectValue placeholder="Choose a product..." />
        </SelectTrigger>
        <SelectContent>
          {mockProducts.map((product) => (
            <SelectItem key={product.id} value={product.id}>
              {product.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        onClick={handlePredict}
        loading={isLoading}
        disabled={isLoading || !selectedProductId}
        className="mt-4"
      >
        <Sparkles className="h-4 w-4 mr-2" />
        {isLoading ? 'Predicting...' : 'Predict Demand'}
      </Button>
    </div>
  );
}
