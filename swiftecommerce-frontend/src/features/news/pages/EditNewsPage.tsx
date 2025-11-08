import { useParams } from 'react-router-dom';
import { Button } from '@/shared/components/ui/Button';
import { Link } from '@/shared/components/ui/Link';
import { useNavigate } from '@/shared/hooks/useNavigate';
import { ArrowLeft } from 'lucide-react';
import { NewsForm, NewsFormData } from '../components/NewsForm';
import { useNewsMutations, useNewsPost } from '../hooks/useNews';
import { QueryLoader } from '@/shared/components/loaders/QueryLoader';

export function EditNewsPage() {
  const { storeId, newsId } = useParams<{ storeId: string; newsId: string }>();
  const navigate = useNavigate();
  const {
    data: newsPost,
    isLoading,
    error,
    refetch,
  } = useNewsPost(storeId!, newsId!);
  const { updatePost } = useNewsMutations(storeId!);

  const handleSubmit = async (data: NewsFormData, newImages: File[]) => {
    await updatePost.mutateAsync({
      id: newsId!,
      data: { ...data, photos: [...newImages] },
    });
    navigate.to(`/store/${storeId}/news/management`);
  };

  const onGenerate = () => {
    navigate.to(`/store/${storeId}/ai`);
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
      <QueryLoader isLoading={isLoading} error={error} refetch={refetch}>
        {newsPost && (
          <NewsForm
            defaultValues={{
              title: newsPost.title,
              content: newsPost.content,
              tags: newsPost.tags,
            }}
            onSubmit={handleSubmit}
            isLoading={updatePost.isPending}
            isEdit
            existingImageUrls={newsPost.photos}
            onGenerate={onGenerate}
          />
        )}
      </QueryLoader>

      {/* Cancel */}
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate.to(`/store/${storeId}/news/management`)}
          disabled={updatePost.isPending}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
