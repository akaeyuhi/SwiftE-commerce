import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/shared/components/ui/Button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/Card';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import {
  useGenerateNames,
  useGenerateDescription,
  useGenerateIdeas,
  useGenerateCustom,
  useGenerateImage,
  useGeneratePost,
} from '../hooks/useAi';
import { AIFeature, aiFeatures } from './AiFeatureSelection';
import { AiResult } from './AiResult';
import { useNavigate } from '@/shared/hooks/useNavigate.ts';
import { GenerateDescriptionForm } from './forms/GenerateDescriptionForm';
import { GenerateNamesForm } from './forms/GenerateNamesForm';
import { GenerateIdeasForm } from './forms/GenerateIdeasForm';
import { GenerateImageForm } from './forms/GenerateImageForm';
import { GenerateCustomForm } from './forms/GenerateCustomForm';
import { GeneratePostForm } from './forms/GeneratePostForm';
import {
  GenerateCustomRequest,
  GenerateDescriptionRequest,
  GenerateIdeasRequest,
  GenerateImageRequest,
  GenerateNamesRequest,
  GeneratePostRequest,
} from '../types/ai-generator.types';

interface AiGeneratorProps {
  selectedFeature: AIFeature;
}

export function AiGenerator({ selectedFeature }: AiGeneratorProps) {
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const [result, setResult] = useState<string | string[] | any | null>(null);
  const [selectedIdea, setSelectedIdea] = useState<any | null>(null);

  const generateNames = useGenerateNames(storeId!);
  const generateDescription = useGenerateDescription(storeId!);
  const generateIdeas = useGenerateIdeas(storeId!);
  const generateCustom = useGenerateCustom(storeId!);
  const generateImage = useGenerateImage(storeId!);
  const generatePost = useGeneratePost(storeId!);

  const generating =
    generateNames.isPending ||
    generateDescription.isPending ||
    generateIdeas.isPending ||
    generateCustom.isPending ||
    generateImage.isPending ||
    generatePost.isPending;

  const handleGenerate = async (data: any) => {
    setResult(null);
    setSelectedIdea(null);

    try {
      let generatedResult: string | string[] | any | null = null;

      switch (selectedFeature) {
        case 'description':
          generatedResult = await generateDescription.mutateAsync(
            data as GenerateDescriptionRequest
          );
          break;

        case 'name':
          generatedResult = await generateNames.mutateAsync(
            data as GenerateNamesRequest
          );
          break;

        case 'news':
          generatedResult = await generatePost.mutateAsync(
            data as GeneratePostRequest
          );
          break;

        case 'whole-product':
          generatedResult = await generateIdeas.mutateAsync(
            data as GenerateIdeasRequest
          );
          break;

        case 'custom':
          generatedResult = await generateCustom.mutateAsync(
            data as GenerateCustomRequest
          );
          break;

        case 'image-generator':
          generatedResult = await generateImage.mutateAsync(
            data as GenerateImageRequest
          );
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
      navigate.toStoreProductCreate(storeId!, {
        state: {
          aiGenerated: {
            name: selectedIdea.name,
            description: selectedIdea.concept,
          },
        },
      });
    } catch (error) {
      toast.error(`Failed to generate product: ${error}`);
    }
  };

  const renderForm = () => {
    switch (selectedFeature) {
      case 'description':
        return (
          <GenerateDescriptionForm
            onSubmit={handleGenerate}
            isLoading={generating}
          />
        );
      case 'name':
        return (
          <GenerateNamesForm onSubmit={handleGenerate} isLoading={generating} />
        );
      case 'news':
        return (
          <GeneratePostForm onSubmit={handleGenerate} isLoading={generating} />
        );
      case 'whole-product':
        return (
          <GenerateIdeasForm onSubmit={handleGenerate} isLoading={generating} />
        );
      case 'image-generator':
        return (
          <GenerateImageForm onSubmit={handleGenerate} isLoading={generating} />
        );
      case 'custom':
        return (
          <GenerateCustomForm
            onSubmit={handleGenerate}
            isLoading={generating}
          />
        );
      default:
        return <p>Select a feature to get started.</p>;
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
        {renderForm()}

        {selectedFeature === 'whole-product' &&
          result &&
          result.ideas.length && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Select an Idea</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.ideas?.map((idea: any, index: number) => (
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
