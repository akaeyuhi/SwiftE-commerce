import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from '@/shared/hooks/useNavigate';
import { AIFeature } from './AiFeatureSelection';

interface AiResultProps {
  result: string | string[];
  selectedFeature: AIFeature;
  storeId: string;
}

export function AiResult({ result, selectedFeature, storeId }: AiResultProps) {
  const navigate = useNavigate();

  const handleUseGeneratedContent = () => {
    if (!result) {
      toast.error('No generated content to use');
      return;
    }

    try {
      switch (selectedFeature) {
        case 'name':
          // For now, just copy the first name
          if (Array.isArray(result) && result.length > 0) {
            navigator.clipboard.writeText(result[0]!);
            toast.success('First name copied to clipboard!');
          }
          break;

        case 'news':
          // Parse and navigate to create news with pre-filled data
          const newsData = JSON.parse(result as string);
          navigate.to(`/store/${storeId}/news/create`, {
            state: { aiGenerated: newsData },
          });
          toast.success('Navigating to news creation...');
          break;

        case 'description':
          // Copy to clipboard for manual use
          navigator.clipboard.writeText(result as string);
          toast.success('Description copied to clipboard!');
          break;

        default:
          navigator.clipboard.writeText(result as string);
          toast.success('Content copied to clipboard!');
      }
    } catch (error) {
      toast.error(`Failed to use generated content: ${error}`);
    }
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
            onClick={() =>
              navigator.clipboard.writeText(
                Array.isArray(result) ? result.join('\n') : result
              )
            }
          >
            Copy
          </Button>
          {(selectedFeature === 'name' || selectedFeature === 'news') && (
            <Button size="sm" onClick={handleUseGeneratedContent}>
              Use & Create
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
      <div className="p-4 bg-muted/50 rounded-lg border border-border">
        {selectedFeature === 'image-generator' ? (
          <img
            src={result as string}
            alt="Generated Image"
            className="rounded-lg border border-border"
          />
        ) : Array.isArray(result) ? (
          <div className="flex flex-wrap gap-2">
            {result.map((name, index) => (
              <Badge key={index} variant="secondary">
                {name}
              </Badge>
            ))}
          </div>
        ) : (
          <pre className="text-sm text-foreground whitespace-pre-wrap font-sans">
            {result}
          </pre>
        )}
      </div>
    </div>
  );
}
