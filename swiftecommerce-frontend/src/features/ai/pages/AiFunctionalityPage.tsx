import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/shared/components/ui/Button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/Card';
import { Textarea } from '@/shared/components/forms/Textarea';
import { Badge } from '@/shared/components/ui/Badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { useNavigate } from '@/shared/hooks/useNavigate';
import { mockProducts } from '@/shared/mocks/products.mock';
import {
  Brain,
  Sparkles,
  FileText,
  Wand2,
  ArrowRight,
  Package,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

type AIFeature =
  | 'description'
  | 'product'
  | 'news'
  | 'stock-predictor'
  | 'custom';

export function AIFunctionalityPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const [generating, setGenerating] = useState(false);
  const [selectedFeature, setSelectedFeature] =
    useState<AIFeature>('description');
  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');

  // AI Features
  const aiFeatures = [
    {
      id: 'description' as AIFeature,
      title: 'Product Description Generator',
      description: 'Generate compelling product descriptions',
      icon: FileText,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      id: 'product' as AIFeature,
      title: 'Complete Product Generator',
      description: 'Create full product with variants',
      icon: Package,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      id: 'news' as AIFeature,
      title: 'News Post Generator',
      description: 'Generate store news and announcements',
      icon: Sparkles,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      id: 'stock-predictor' as AIFeature,
      title: 'Stock Outage Predictor',
      description: 'Predict inventory shortages',
      icon: AlertTriangle,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
    {
      id: 'custom' as AIFeature,
      title: 'Custom Prompt',
      description: 'Use AI with custom instructions',
      icon: Wand2,
      color: 'text-pink-500',
      bgColor: 'bg-pink-500/10',
    },
  ];

  const handleGenerate = async () => {
    if (!inputText.trim() && selectedFeature !== 'stock-predictor') {
      toast.error('Please enter some text');
      return;
    }

    if (selectedFeature === 'stock-predictor' && !selectedProductId) {
      toast.error('Please select a product');
      return;
    }

    setGenerating(true);
    try {
      // TODO: Replace with actual AI API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Generate different content based on feature
      let generatedResult = '';

      switch (selectedFeature) {
        case 'description':
          generatedResult = `Premium quality product designed for excellence. Features advanced technology and superior craftsmanship. Perfect for both professionals and enthusiasts.

Key Benefits:
• High-performance design
• Durable construction
• Modern aesthetics
• Exceptional value

Experience the difference with this outstanding product!`;
          break;

        case 'product':
          generatedResult = JSON.stringify(
            {
              name: 'AI Generated Product',
              description: 'A cutting-edge product created with AI assistance',
              variants: [
                { sku: 'AI-001', price: 99.99, quantity: 50 },
                { sku: 'AI-002', price: 109.99, quantity: 30 },
              ],
              categories: ['Electronics', 'Tech'],
            },
            null,
            2
          );
          break;

        case 'news':
          generatedResult = JSON.stringify(
            {
              title: 'Exciting New Product Launch!',
              excerpt: 'Discover our latest innovation in technology',
              content:
                'We are thrilled to announce the launch of our newest product line...',
              tags: ['Launch', 'Innovation', 'New'],
            },
            null,
            2
          );
          break;

        case 'stock-predictor':
          const product = mockProducts.find((p) => p.id === selectedProductId);
          generatedResult = `Stock Analysis for: ${product?.name}

📊 Current Status:
• Total Stock: ${product?.variants.reduce((sum, v) => sum + v.inventory.quantity, 0)} units
• Average Daily Sales: 5-8 units
• Predicted Outage: 15-20 days

⚠️ Recommendations:
• Restock within 2 weeks
• Consider ordering 200+ units
• Monitor variant: ${product?.variants?.[0]?.sku}

📈 Sales Trend: Increasing (+12%)`;
          break;

        case 'custom':
          generatedResult = `Custom AI Response based on your prompt:

${inputText}

This is a generated response that addresses your specific request with relevant information and actionable insights.`;
          break;
      }

      setResult(generatedResult);
      toast.success('AI generation complete!');
    } catch (error) {
      toast.error(`Failed to generate content: ${error}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleUseGeneratedContent = () => {
    if (!result) {
      toast.error('No generated content to use');
      return;
    }

    try {
      switch (selectedFeature) {
        case 'product':
          // Parse and navigate to create product with pre-filled data
          const productData = JSON.parse(result);
          navigate.to(`/store/${storeId}/products/create`, {
            state: { aiGenerated: productData },
          });
          toast.success('Navigating to product creation...');
          break;

        case 'news':
          // Parse and navigate to create news with pre-filled data
          const newsData = JSON.parse(result);
          navigate.to(`/store/${storeId}/news/create`, {
            state: { aiGenerated: newsData },
          });
          toast.success('Navigating to news creation...');
          break;

        case 'description':
          // Copy to clipboard for manual use
          navigator.clipboard.writeText(result);
          toast.success('Description copied to clipboard!');
          break;

        default:
          navigator.clipboard.writeText(result);
          toast.success('Content copied to clipboard!');
      }
    } catch (error) {
      toast.error(`Failed to use generated content: ${error}`);
    }
  };

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {aiFeatures.map((feature) => {
          const Icon = feature.icon;
          const isSelected = selectedFeature === feature.id;
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

      {/* AI Generator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {aiFeatures.find((f) => f.id === selectedFeature)?.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stock Predictor Product Selection */}
          {selectedFeature === 'stock-predictor' && (
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Select Product
              </label>
              <Select
                value={selectedProductId}
                onValueChange={setSelectedProductId}
              >
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
            </div>
          )}

          {/* Input Field */}
          {selectedFeature !== 'stock-predictor' && (
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Input{' '}
                {selectedFeature === 'description'
                  ? '(Product name or keywords)'
                  : selectedFeature === 'product'
                    ? '(Product idea or specifications)'
                    : selectedFeature === 'news'
                      ? '(News topic or announcement)'
                      : '(Your custom prompt)'}
              </label>
              <Textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  selectedFeature === 'description'
                    ? 'Enter product name or keywords...'
                    : selectedFeature === 'product'
                      ? 'Describe the product you want to create...'
                      : selectedFeature === 'news'
                        ? 'Enter news topic or announcement...'
                        : 'Enter your custom prompt...'
                }
                rows={4}
              />
            </div>
          )}

          <Button
            onClick={handleGenerate}
            loading={generating}
            disabled={
              (!inputText.trim() && selectedFeature !== 'stock-predictor') ||
              (selectedFeature === 'stock-predictor' && !selectedProductId)
            }
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {generating ? 'Generating...' : 'Generate with AI'}
          </Button>

          {/* Result */}
          {result && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-foreground">
                  Generated Content
                </label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(result)}
                  >
                    Copy
                  </Button>
                  {(selectedFeature === 'product' ||
                    selectedFeature === 'news') && (
                    <Button size="sm" onClick={handleUseGeneratedContent}>
                      Use & Create
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg border border-border">
                <pre className="text-sm text-foreground whitespace-pre-wrap font-sans">
                  {result}
                </pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
