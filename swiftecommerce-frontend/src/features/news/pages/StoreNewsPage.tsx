import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { SearchBar } from '@/shared/components/ui/SearchBar';
import { Newspaper, ArrowLeft } from 'lucide-react';
import { useNews } from '../hooks/useNews';
import { QueryLoader } from '@/shared/components/loaders/QueryLoader';
import { NewsCard } from '../components/public/NewsCard';
import { Pagination } from '@/shared/components/ui/Pagination';
import { useStore } from '@/features/stores/hooks/useStores.ts';
import { Link } from '@/shared/components/ui/Link.tsx';
import { buildUrl } from '@/config/api.config.ts';
import { ROUTES } from '@/app/routes/routes.ts';
import { Button } from '@/shared/components/ui/Button';
import { ErrorBoundary } from '@/shared/components/errors/ErrorBoundary';

export function StoreNewsPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, error, refetch } = useNews(storeId!, {
    q: searchQuery,
    page,
    limit: 10,
  });

  const { data: store, isLoading: storeLoading } = useStore(storeId!);

  const news = data?.data || [];
  const meta = data?.meta;

  return (
    <ErrorBoundary title="Store News Error">
      <div className="min-h-screen bg-background">
        {/* Store Banner */}
        {storeLoading ? (
          <div className="h-48 bg-muted animate-pulse" />
        ) : (
          <div
            className="h-48 bg-gradient-to-br from-primary/20
          to-primary/5 relative overflow-hidden"
          >
            {store?.bannerUrl ? (
              <img
                src={store.bannerUrl}
                alt={store.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <Newspaper className="h-16 w-16 mx-auto mb-2 opacity-50" />
                  <p className="text-xl font-bold">{store?.name}</p>
                </div>
              </div>
            )}
            {/* Overlay for better text readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/80" />
          </div>
        )}

        {/* Main Content */}
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Back Button */}
            <Link
              to={buildUrl(ROUTES.STORE_PUBLIC, { storeId: storeId! })}
              className="inline-block"
            >
              <Button variant="ghost" size="sm" className="mb-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Store
              </Button>
            </Link>

            {/* Header */}
            <div className="text-center space-y-4">
              {/* Store Logo */}
              {store?.logoUrl && (
                <div className="flex justify-center">
                  <img
                    src={store.logoUrl}
                    alt={store.name}
                    className="w-20 h-20 rounded-lg object-cover border-2 border-border shadow-md"
                  />
                </div>
              )}

              <div>
                <h1 className="text-4xl font-bold text-foreground mb-2">
                  {store?.name || 'Store'} News
                </h1>
                <p className="text-lg text-muted-foreground">
                  Stay updated with the latest announcements and updates
                </p>
              </div>

              {/* Store Stats */}
              {store && (
                <div className="flex justify-center gap-6 text-sm text-muted-foreground">
                  <div>
                    <span className="font-semibold text-foreground">
                      {store.productCount || 0}
                    </span>{' '}
                    Products
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">
                      {store.followerCount || 0}
                    </span>{' '}
                    Followers
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">
                      {news.length}
                    </span>{' '}
                    News Posts
                  </div>
                </div>
              )}
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

            {/* Results Count */}
            {!isLoading && news.length > 0 && (
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <p>
                  Showing {news.length} of {meta?.total || 0} posts
                </p>
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchQuery('')}
                  >
                    Clear search
                  </Button>
                )}
              </div>
            )}

            {/* News List */}
            <QueryLoader
              isLoading={isLoading}
              error={error}
              refetch={refetch}
              loadingMessage="Loading news..."
            >
              {news.length > 0 ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-6">
                    {news.map((post) => (
                      <NewsCard key={post.id} news={post} />
                    ))}
                  </div>

                  {/* Pagination */}
                  {meta && meta.totalPages > 1 && (
                    <div className="flex justify-center pt-4">
                      <Pagination
                        currentPage={meta.page}
                        totalPages={meta.totalPages}
                        onPageChange={setPage}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12">
                    <EmptyState
                      icon={Newspaper}
                      title={
                        searchQuery ? 'No news found' : 'No news posts yet'
                      }
                      description={
                        searchQuery
                          ? `No posts match "${searchQuery}". Try a different search term.`
                          : `This store hasn't published any news yet. Check back later!`
                      }
                      action={
                        searchQuery
                          ? {
                              label: 'Clear search',
                              onClick: () => setSearchQuery(''),
                            }
                          : undefined
                      }
                    />
                  </CardContent>
                </Card>
              )}
            </QueryLoader>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
