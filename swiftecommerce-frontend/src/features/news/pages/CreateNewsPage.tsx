import { useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { Button } from '@/shared/components/ui/Button';
import { Link } from '@/shared/components/ui/Link';
import { useNavigate } from '@/shared/hooks/useNavigate';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { NewsForm, NewsFormData } from '../components/NewsForm';
import { Badge } from '@/shared/components/ui/Badge';

export function CreateNewsPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const location = useLocation();
  const aiGeneratedData = location.state?.aiGenerated;
  const defaultValues = aiGeneratedData
    ? {
        title: aiGeneratedData.title || '',
        excerpt: aiGeneratedData.excerpt || '',
        content: aiGeneratedData.content || '',
        tags: aiGeneratedData.tags || [],
      }
    : undefined;

  const handleSubmit = async (data: NewsFormData) => {
    setIsLoading(true);
    try {
      // TODO: API call
      // await newsService.createNews(storeId!, data)
      await new Promise((resolve) => setTimeout(resolve, 1000));

      console.log('Creating news:', data);
      toast.success('News published successfully!');
      navigate.to(`/store/${storeId}/news`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to publish news');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <Link
          to={`/store/${storeId}/news/management`}
          className="inline-flex items-center gap-2 text-sm
          text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to News
        </Link>
        {aiGeneratedData && (
          <Badge variant="success" className="mb-4">
            <Sparkles className="h-3 w-3 mr-1" />
            AI Generated Content
          </Badge>
        )}
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Create News Post
        </h1>
        <p className="text-muted-foreground">
          Share updates and announcements with your customers
        </p>
      </div>

      {/* Form */}
      <NewsForm
        onSubmit={handleSubmit}
        isLoading={isLoading}
        defaultValues={defaultValues}
      />

      {/* Cancel */}
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate.to(`/store/${storeId}/news`)}
          disabled={isLoading}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
