import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/shared/components/ui/Button';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { SearchBar } from '@/shared/components/ui/SearchBar';
import { ConfirmDialog } from '@/shared/components/dialogs/ConfirmDialog';
import { useNavigate } from '@/shared/hooks/useNavigate';
import { mockNews } from '@/shared/mocks/news.mock';
import {
  Plus,
  Edit,
  Trash2,
  Newspaper,
  Calendar,
  Eye,
  Heart,
} from 'lucide-react';
import { toast } from 'sonner';

export function NewsManagementPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    newsId: string | null;
  }>({ open: false, newsId: null });

  // Filter news for this store
  const storeNews = mockNews.filter((news) => news.storeId === storeId);

  const filteredNews = storeNews.filter(
    (news) =>
      news.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      news.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  console.log(filteredNews, storeNews);

  const handleDelete = async () => {
    if (!deleteDialog.newsId) return;

    try {
      // TODO: API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      toast.success('News post deleted');
      setDeleteDialog({ open: false, newsId: null });
    } catch (error) {
      toast.error(`Failed to delete news post: ${error}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            News Management
          </h1>
          <p className="text-muted-foreground">
            Create and manage your store news and announcements
          </p>
        </div>
        <Button onClick={() => navigate.to(`/store/${storeId}/news/create`)}>
          <Plus className="h-4 w-4 mr-2" />
          Create News
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-6">
          <SearchBar
            placeholder="Search news..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* News List */}
      {filteredNews.length === 0 ? (
        <Card>
          <EmptyState
            icon={Newspaper}
            title="No news posts found"
            description={
              searchQuery
                ? 'Try adjusting your search'
                : 'Create your first news post to get started'
            }
            action={
              !searchQuery
                ? {
                    label: 'Create News',
                    onClick: () => navigate.to(`/store/${storeId}/news/create`),
                  }
                : undefined
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredNews.map((news) => (
            <Card key={news.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  {/* Image */}
                  {news.imageUrl && (
                    <div className="h-32 w-48 bg-muted rounded-lg flex-shrink-0" />
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      {news.title}
                    </h3>

                    {/* Meta */}
                    <div
                      className="flex flex-wrap items-center
                    gap-4 text-sm text-muted-foreground mb-3"
                    >
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(news.createdAt).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        {news.views} views
                      </div>
                      <div className="flex items-center gap-1">
                        <Heart className="h-4 w-4" />
                        {news.likes} likes
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {news.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                      {news.excerpt}
                    </p>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          navigate.to(`/store/${storeId}/news/${news.id}/edit`)
                        }
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setDeleteDialog({ open: true, newsId: news.id })
                        }
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open: boolean) =>
          setDeleteDialog({ open, newsId: null })
        }
        title="Delete news post?"
        description="This will permanently delete this news post. This action cannot be undone."
        confirmText="Delete"
        variant="danger"
        onConfirm={handleDelete}
      />
    </div>
  );
}
