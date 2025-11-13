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
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import {
  useGenerateNames,
  useGenerateDescription,
  useGenerateIdeas,
  useGenerateCustom,
  useGenerateWholeProduct,
  useGenerateImage,
} from '../hooks/useAi';
import { AIFeature, aiFeatures } from './AiFeatureSelection';
import { AiResult } from './AiResult';
import { useNavigate } from '@/shared/hooks/useNavigate.ts';

interface AiGeneratorProps {
  selectedFeature: AIFeature;
}

export function AiGenerator({ selectedFeature }: AiGeneratorProps) {
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState<string | string[] | any | null>(null);
  const [selectedIdea, setSelectedIdea] = useState<any | null>(null);

  const generateNames = useGenerateNames(storeId!);
  const generateDescription = useGenerateDescription(storeId!);
  const generateIdeas = useGenerateIdeas(storeId!);
  const generateCustom = useGenerateCustom(storeId!);
  const generateWholeProduct = useGenerateWholeProduct(storeId!);
  const generateImage = useGenerateImage(storeId!);

  const generating =
    generateNames.isPending ||
    generateDescription.isPending ||
    generateIdeas.isPending ||
    generateCustom.isPending ||
    generateWholeProduct.isPending ||
    generateImage.isPending;

  const handleGenerate = async () => {
    if (!inputText.trim() && selectedFeature !== 'whole-product') {
      toast.error('Please enter some text');
      return;
    }

    setResult(null);
    setSelectedIdea(null);

    try {
      let generatedResult: string | string[] | any | null = null;

      switch (selectedFeature) {
        case 'description':
          generatedResult = await generateDescription.mutateAsync({
            name: inputText,
            productSpec: '',
          });
          break;

        case 'name':
          generatedResult = await generateNames.mutateAsync({
            seed: inputText,
            storeStyle: 'modern and minimalist',
          });
          break;

        case 'news':
          generatedResult = await generateIdeas.mutateAsync({
            seed: inputText,
            storeStyle: 'modern and minimalist',
          });
          break;

        case 'custom':
          generatedResult = await generateCustom.mutateAsync({
            prompt: inputText,
          });
          break;

        case 'whole-product':
          generatedResult = await generateIdeas.mutateAsync({
            seed: inputText,
            storeStyle: 'modern and minimalist',
          });
          break;

        case 'image-generator':
          generatedResult = await generateImage.mutateAsync({
            prompt: inputText,
          });
          break;
      }

      setResult(generatedResult);
      toast.success('AI generation complete!');
    } catch (error) {
      toast.error(`Failed to generate content: ${error}`);
    }
  };

  const handleGenerateWholeProduct = async () => {
    if (!selectedIdea) {
      toast.error('Please select an idea first');
      return;
    }

    try {
      const result = await generateWholeProduct.mutateAsync({
        idea: selectedIdea.concept,
      });
      navigate.toStoreProductCreate(storeId!, {
        state: {
          aiGenerated: {
            name: result.name,
            description: result.description,
          },
        },
      });
    } catch (error) {
      toast.error(`Failed to generate product: ${error}`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          {aiFeatures.find((f) => f.id === selectedFeature)?.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            Input{' '}
            {selectedFeature === 'description'
              ? '(Product name or keywords)'
              : selectedFeature === 'name'
                ? '(Product idea or specifications)'
                : selectedFeature === 'news'
                  ? '(News topic or announcement)'
                  : selectedFeature === 'whole-product'
                    ? '(Product idea or keywords)'
                    : selectedFeature === 'image-generator'
                      ? '(Image prompt)'
                      : '(Your custom prompt)'}
          </label>
          <Textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              selectedFeature === 'description'
                ? 'Enter product name or keywords...'
                : selectedFeature === 'name'
                  ? 'Enter a seed word for name generation...'
                  : selectedFeature === 'news'
                    ? 'Enter news topic or announcement...'
                    : selectedFeature === 'whole-product'
                      ? 'e.g., "A smart water bottle that tracks hydration"'
                      : selectedFeature === 'image-generator'
                        ? 'e.g., "A futuristic product render"'
                        : 'Enter your custom prompt...'
            }
            rows={4}
          />
        </div>

        <Button
          onClick={handleGenerate}
          loading={generating}
          disabled={
            generating ||
            (!inputText.trim() && selectedFeature !== 'whole-product')
          }
        >
          <Sparkles className="h-4 w-4 mr-2" />
          {generating
            ? 'Generating...'
            : selectedFeature === 'whole-product'
              ? 'Generate Ideas'
              : 'Generate with AI'}
        </Button>

        {selectedFeature === 'whole-product' && result && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Select an Idea</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.ideas.map((idea: any, index: number) => (
                <Card
                  key={index}
                  className={`cursor-pointer ${
                    selectedIdea?.name === idea.name
                      ? 'border-primary'
                      : 'border-border'
                  }`}
                  onClick={() => setSelectedIdea(idea)}
                >
                  <CardHeader>
                    <CardTitle>{idea.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>{idea.concept}</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {idea.rationale}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Button
              onClick={handleGenerateWholeProduct}
              disabled={!selectedIdea || generating}
              loading={generating}
            >
              Generate Product from Idea
            </Button>
          </div>
        )}

        {selectedFeature !== 'whole-product' && result && (
          <AiResult
            result={result}
            selectedFeature={selectedFeature}
            storeId={storeId!}
          />
        )}
      </CardContent>
    </Card>
  );
}
