import { Card, CardContent } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import {
  Sparkles,
  FileText,
  Package,
  AlertTriangle,
  Wand2,
  Image,
} from 'lucide-react';

export type AIFeature =
  | 'description'
  | 'name'
  | 'news'
  | 'stock-predictor'
  | 'whole-product'
  | 'image-generator'
  | 'custom';

const iconMap = {
  FileText,
  Package,
  Sparkles,
  AlertTriangle,
  Wand2,
  Image,
};

export const aiFeatures = [
  {
    id: 'description' as AIFeature,
    title: 'Product Description Generator',
    description: 'Generate compelling product descriptions',
    icon: 'FileText',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    id: 'name' as AIFeature,
    title: 'Product Name Generator',
    description: 'Generate catchy product names',
    icon: 'Package',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  {
    id: 'whole-product' as AIFeature,
    title: 'Product generator',
    description: 'Generate whole product',
    icon: 'Wand2',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  {
    id: 'image-generator' as AIFeature,
    title: 'Image generator',
    description: 'Generate product images',
    icon: 'Image',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
  },
  {
    id: 'news' as AIFeature,
    title: 'News Post Generator',
    description: 'Generate store news and announcements',
    icon: 'Sparkles',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  {
    id: 'stock-predictor' as AIFeature,
    title: 'Stock Outage Predictor',
    description: 'Predict inventory shortages',
    icon: 'AlertTriangle',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
  {
    id: 'custom' as AIFeature,
    title: 'Custom Prompt',
    description: 'Use AI with custom instructions',
    icon: 'Wand2',
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
  },
];

interface AiFeatureSelectionProps {
  selectedFeature: AIFeature;
  setSelectedFeature: (feature: AIFeature) => void;
}

export function AiFeatureSelection({
  selectedFeature,
  setSelectedFeature,
}: AiFeatureSelectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {aiFeatures.map((feature) => {
        const isSelected = selectedFeature === feature.id;
        const Icon = iconMap[feature.icon as keyof typeof iconMap];
        return (
          <Card
            key={feature.id}
            className={`cursor-pointer transition-all ${
              isSelected ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-md'
            }`}
            onClick={() => setSelectedFeature(feature.id)}
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div
                  className={`h-12 w-12 ${feature.bgColor} rounded-lg flex items-center justify-center`}
                >
                  <Icon className={`h-6 w-6 ${feature.color}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-foreground">
                      {feature.title}
                    </h3>
                    <Badge variant="secondary" className="text-xs">
                      <Sparkles className="h-3 w-3 mr-1" />
                      AI
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
