import { NewsPost } from '@/features/news/types/news.types';
import { NewsManagementListItem } from './NewsManagementListItem';
import { useNewsMutations } from '../../hooks/useNews';
import { useState } from 'react';
import { ConfirmDialog } from '@/shared/components/dialogs/ConfirmDialog';
import { useParams } from 'react-router-dom';

interface NewsManagementListProps {
  news: NewsPost[];
}

export function NewsManagementList({ news }: NewsManagementListProps) {
  const { storeId } = useParams<{ storeId: string }>();
  const { deletePost, publishPost, unpublishPost } = useNewsMutations(storeId!);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    newsId: string | null;
  }>({ open: false, newsId: null });

  const handleDeleteClick = (newsId: string) => {
    setDeleteDialog({ open: true, newsId });
  };

  const handleConfirmDelete = () => {
    if (deleteDialog.newsId) {
      deletePost.mutate(deleteDialog.newsId);
      setDeleteDialog({ open: false, newsId: null });
    }
  };

  const handlePublishToggle = (newsId: string, isPublished: boolean) => {
    if (isPublished) {
      unpublishPost.mutate(newsId);
    } else {
      publishPost.mutate(newsId);
    }
  };

  return (
    <div className="space-y-4">
      {news.map((post) => (
        <NewsManagementListItem
          key={post.id}
          news={post}
          onDelete={handleDeleteClick}
          onPublishToggle={handlePublishToggle}
          isToggling={publishPost.isPending || unpublishPost.isPending}
        />
      ))}
      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) =>
          setDeleteDialog({ open, newsId: open ? deleteDialog.newsId : null })
        }
        title="Delete news post?"
        description="This will permanently delete this news post. This action cannot be undone."
        confirmText="Delete"
        variant="danger"
        onConfirm={handleConfirmDelete}
        loading={deletePost.isPending}
      />
    </div>
  );
}
