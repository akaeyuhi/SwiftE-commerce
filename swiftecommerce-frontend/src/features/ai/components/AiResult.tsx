import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from '@/shared/hooks/useNavigate';
import { AIFeature } from './AiFeatureSelection';
import { Markdown } from '@/shared/components/ui/Markdown.tsx';

interface AiResultProps {
  result: any;
  selectedFeature: AIFeature;
  storeId: string;
}

export function AiResult({ result, selectedFeature, storeId }: AiResultProps) {
  const navigate = useNavigate();

  const getResultAsString = () => {
    if (typeof result === 'string') {
      return result;
    }
    if (Array.isArray(result)) {
      return result.join('\n');
    }
    if (typeof result === 'object' && result.title && result.description) {
      return `Title: ${result.title}\n\nDescription: ${result.description}`;
    }
    return '';
  };

  const handleNameClick = (name: string) => {
    navigate.toStoreProductCreate(storeId, {
      state: {
        aiGenerated: { name },
      },
    });
    toast.success(`Using "${name}" to create a new product...`);
  };

  const handleUseGeneratedContent = () => {
    if (!result) {
      toast.error('No generated content to use');
      return;
    }

    try {
      switch (selectedFeature) {
        case 'description':
          navigate.toStoreProductCreate(storeId, {
            state: {
              aiGenerated: {
                name: result.title,
                description: result.description,
              },
            },
          });
          toast.success('Navigating to product creation...');
          break;

        case 'news':
          navigate.to(`/store/${storeId}/news/create`, {
            state: {
              aiGenerated: {
                title: result.title,
                content: result.content,
              },
            },
          });
          toast.success('Navigating to news creation...');
          break;

        default:
          navigator.clipboard.writeText(getResultAsString());
          toast.success('Content copied to clipboard!');
      }
    } catch (error) {
      toast.error(`Failed to use generated content: ${error}`);
    }
  };

  const renderResult = () => {
    if (selectedFeature === 'image-generator' && typeof result === 'string') {
      return (
        <img
          src={result}
          alt="Generated"
          className="rounded-lg border border-border max-w-full"
        />
      );
    }
    if (selectedFeature === 'name' && Array.isArray(result)) {
      return (
        <div className="flex flex-wrap gap-2">
          {result.map((item, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
              onClick={() => handleNameClick(item)}
            >
              {item}
            </Badge>
          ))}
        </div>
      );
    }
    if (
      selectedFeature === 'description' &&
      typeof result === 'object' &&
      result.title &&
      result.description
    ) {
      return (
        <div className="space-y-2">
          <h4 className="font-semibold">{result.title}</h4>
          <p className="text-sm text-foreground whitespace-pre-wrap font-sans">
            {result.description}
          </p>
        </div>
      );
    }
    if (
      selectedFeature === 'news' &&
      typeof result === 'object' &&
      result.title &&
      result.content
    ) {
      return (
        <div className="space-y-2">
          <h4 className="font-semibold">{result.title}</h4>
          <p className="text-sm text-foreground whitespace-pre-wrap font-sans">
            {result.content}
          </p>
        </div>
      );
    }
    if (selectedFeature === 'custom' && typeof result === 'string') {
      return (
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <Markdown>{result}</Markdown>
        </div>
      );
    }
    if (typeof result === 'string') {
      return (
        <pre className="text-sm text-foreground whitespace-pre-wrap font-sans">
          {result}
        </pre>
      );
    }
    return null;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-foreground">
          Generated Content
        </label>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(getResultAsString());
              toast.success('Copied to clipboard!');
            }}
          >
            Copy
          </Button>
          {(selectedFeature === 'news' ||
            selectedFeature === 'description') && (
            <Button size="sm" onClick={handleUseGeneratedContent}>
              Use & Create
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
      <div className="p-4 bg-muted/50 rounded-lg border border-border">
        {renderResult()}
      </div>
    </div>
  );
}
