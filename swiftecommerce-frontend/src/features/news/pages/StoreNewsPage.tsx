import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { SearchBar } from '@/shared/components/ui/SearchBar';
import { Newspaper } from 'lucide-react';
import { useNews } from '../hooks/useNews';
import { QueryLoader } from '@/shared/components/loaders/QueryLoader';
import { NewsCard } from '../components/public/NewsCard';
import { Pagination } from '@/shared/components/ui/Pagination';

export function StoreNewsPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, error, refetch } = useNews(storeId!, {
    q: searchQuery,
    page,
    limit: 10,
  });

  const news = data?.data || [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Store News</h1>
        <p className="text-muted-foreground">
          Stay updated with the latest announcements and updates
        </p>
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
        {news.length > 0 ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              {news.map((post) => (
                <NewsCard key={post.id} news={post} />
              ))}
            </div>
            {meta && meta.totalPages > 1 && (
              <Pagination
                currentPage={meta.page}
                totalPages={meta.totalPages}
                onPageChange={setPage}
              />
            )}
          </div>
        ) : (
          <Card>
            <EmptyState
              icon={Newspaper}
              title="No news found"
              description={
                searchQuery
                  ? 'Try adjusting your search'
                  : 'No news posts available yet'
              }
            />
          </Card>
        )}
      </QueryLoader>
    </div>
  );
}
