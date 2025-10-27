import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/shared/components/ui/Button';
import { Link } from '@/shared/components/ui/Link';
import { useNavigate } from '@/shared/hooks/useNavigate';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { NewsForm, NewsFormData } from '../components/NewsForm';
import { mockNews } from '@/shared/mocks/news.mock';

export function EditNewsPage() {
  const { storeId, newsId } = useParams<{ storeId: string; newsId: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [existingImage, setExistingImage] = useState<string | undefined>(
    undefined
  );

  // Find news post
  const newsPost = mockNews.find((n) => n.id === newsId);

  if (!newsPost) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-foreground mb-4">
          News post not found
        </h2>
        <Button onClick={() => navigate.to(`/store/${storeId}/news`)}>
          Back to News
        </Button>
      </div>
    );
  }

  const handleSubmit = async (data: NewsFormData) => {
    setIsLoading(true);
    try {
      // TODO: API call
      // await newsService.updateNews(storeId!, newsId!, data)
      await new Promise((resolve) => setTimeout(resolve, 1000));

      console.log('Updating news:', data);
      toast.success('News updated successfully!');
      navigate.to(`/store/${storeId}/news`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update news');
    } finally {
      setIsLoading(false);
    }
  };

  const defaultValues: Partial<NewsFormData> = {
    title: newsPost.title,
    excerpt: newsPost.excerpt,
    content: newsPost.content,
    tags: newsPost.tags,
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
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Edit News Post
        </h1>
        <p className="text-muted-foreground">Update your news post details</p>
      </div>

      {/* Form */}
      <NewsForm
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        isEdit
        existingImage={existingImage}
        onRemoveImage={() => setExistingImage(undefined)}
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
