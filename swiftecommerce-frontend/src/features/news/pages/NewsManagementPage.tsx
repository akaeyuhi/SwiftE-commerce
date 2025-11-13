import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/shared/components/ui/Button';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { SearchBar } from '@/shared/components/ui/SearchBar';
import { useNavigate } from '@/shared/hooks/useNavigate';
import { Plus, Newspaper } from 'lucide-react';
import { useStoreNews } from '../hooks/useNews';
import { QueryLoader } from '@/shared/components/loaders/QueryLoader';
import { NewsManagementList } from '../components/management/NewsManagementList';

export function NewsManagementPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: news, isLoading, error, refetch } = useStoreNews(storeId!);

  const filteredNews = news?.filter(
    (post) =>
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      <QueryLoader isLoading={isLoading} error={error} refetch={refetch}>
        {filteredNews && filteredNews.length > 0 ? (
          <NewsManagementList news={filteredNews} />
        ) : (
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
                      onClick: () =>
                        navigate.to(`/store/${storeId}/news/create`),
                    }
                  : undefined
              }
            />
          </Card>
        )}
      </QueryLoader>
    </div>
  );
}
