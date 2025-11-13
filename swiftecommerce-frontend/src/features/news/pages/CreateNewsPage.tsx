import { useLocation, useParams } from 'react-router-dom';
import { Button } from '@/shared/components/ui/Button';
import { Link } from '@/shared/components/ui/Link';
import { useNavigate } from '@/shared/hooks/useNavigate';
import { ArrowLeft } from 'lucide-react';
import { NewsForm, NewsFormData } from '../components/NewsForm';
import { useNewsMutations } from '../hooks/useNews';

export function CreateNewsPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const { createPost } = useNewsMutations(storeId!);
  const location = useLocation();
  const aiGeneratedData = location.state?.aiGenerated;
  const defaultValues = aiGeneratedData
    ? {
        title: aiGeneratedData.title || '',
        content: aiGeneratedData.content || '',
        tags: aiGeneratedData.tags || [],
      }
    : undefined;

  const handleSubmit = async (data: NewsFormData, newImages: File[]) => {
    await createPost.mutateAsync({ ...data, photos: [...newImages] });
    navigate.to(`/store/${storeId}/news/management`);
  };

  const onGenerate = () => {
    console.log('generate');
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
          Create News Post
        </h1>
        <p className="text-muted-foreground">
          Share updates and announcements with your customers
        </p>
      </div>

      {/* Form */}
      <NewsForm
        onSubmit={handleSubmit}
        isLoading={createPost.isPending}
        defaultValues={defaultValues}
        onGenerate={onGenerate}
      />

      {/* Cancel */}
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate.to(`/store/${storeId}/news/management`)}
          disabled={createPost.isPending}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
