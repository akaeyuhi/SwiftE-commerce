import { useState } from 'react';
import { Brain } from 'lucide-react';
import {
  AIFeature,
  AiFeatureSelection,
} from '../components/AiFeatureSelection';
import { AiGenerator } from '../components/AiGenerator';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/Card';
import { StockPredictor } from '@/features/ai/components/stock-predictor/StockPredictor.tsx';

export function AIFunctionalityPage() {
  const [selectedFeature, setSelectedFeature] =
    useState<AIFeature>('description');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
          <Brain className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">AI Tools</h1>
          <p className="text-muted-foreground">
            Enhance your store with AI-powered features
          </p>
        </div>
      </div>

      {/* Feature Selection */}
      <AiFeatureSelection
        selectedFeature={selectedFeature}
        setSelectedFeature={setSelectedFeature}
      />

      {/* AI Generator or Stock Predictor */}
      {selectedFeature === 'stock-predictor' ? (
        <StockPredictor />
      ) : (
        <AiGenerator selectedFeature={selectedFeature} />
      )}

      {/* Usage Stats */}
      <Card>
        <CardHeader>
          <CardTitle>AI Usage This Month</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <p className="text-2xl font-bold text-foreground">45</p>
              <p className="text-sm text-muted-foreground">
                Descriptions Generated
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">8</p>
              <p className="text-sm text-muted-foreground">Products Created</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">12</p>
              <p className="text-sm text-muted-foreground">News Posts</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">156 / 200</p>
              <p className="text-sm text-muted-foreground">
                API Calls Remaining
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
