import { useParams } from 'react-router-dom';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { QueryLoader } from '@/shared/components/loaders/QueryLoader';
import { ErrorState } from '@/shared/components/errors/ErrorState';
import { ErrorBoundary } from '@/shared/components/errors/ErrorBoundary';
import { useNewsPost } from '../hooks/useNews';
import { useStore } from '@/features/stores/hooks/useStores';
import { useNavigate } from '@/shared/hooks/useNavigate';
import { ArrowLeft, Calendar, User, Share2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from '@/shared/components/ui/Link';
import { buildUrl } from '@/config/api.config';
import { ROUTES } from '@/app/routes/routes';
import { toast } from 'sonner';

export function NewsPostPage() {
  const { storeId, postId } = useParams<{ storeId: string; postId: string }>();
  const navigate = useNavigate();

  const {
    data: post,
    isLoading,
    error,
    refetch,
  } = useNewsPost(storeId!, postId!);

  const { data: store } = useStore(storeId!);

  const handleShare = async () => {
    const postUrl = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: post?.title,
          text: post?.content.substring(0, 100) + '...',
          url: postUrl,
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Share failed:', error);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(postUrl);
        toast.success('Link copied to clipboard');
      } catch (error) {
        toast.error(`Failed to copy link: ${error}`);
      }
    }
  };

  const handleBack = () => {
    navigate.to(`/store/${storeId}/news`);
  };

  if (error && !isLoading) {
    return (
      <ErrorState
        error={error}
        title="Post not found"
        description="The news post you're looking for doesn't exist or has been removed"
        variant="full-page"
        actions={[
          {
            label: 'Back to News',
            onClick: handleBack,
          },
        ]}
      />
    );
  }

  return (
    <ErrorBoundary title="News Post Error">
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <QueryLoader
            isLoading={isLoading}
            error={error}
            refetch={refetch}
            loadingMessage="Loading post..."
          >
            {post && (
              <div className="max-w-4xl mx-auto space-y-6">
                {/* Back Button */}
                <Button variant="ghost" onClick={handleBack} className="mb-4">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to News
                </Button>

                {/* Store Info */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Link
                    to={buildUrl(ROUTES.STORE_PUBLIC, { storeId: storeId! })}
                    className="hover:text-primary transition-colors"
                  >
                    {store?.name}
                  </Link>
                  <span>/</span>
                  <span>News</span>
                </div>

                {/* Main Post Card */}
                <Card>
                  <CardContent className="p-0">
                    {/* Hero Image */}
                    {post.mainPhotoUrl && (
                      <div className="w-full aspect-[21/9] overflow-hidden rounded-t-lg">
                        <img
                          src={post.mainPhotoUrl}
                          alt={post.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* Content */}
                    <div className="p-8">
                      {/* Header */}
                      <div className="mb-6">
                        <div className="flex items-center gap-2 mb-4">
                          {post.isPublished && (
                            <Badge
                              variant={
                                post.isPublished ? 'default' : 'secondary'
                              }
                            >
                              {post.isPublished ? 'Published' : 'Draft'}
                            </Badge>
                          )}
                        </div>

                        <h1 className="text-4xl font-bold text-foreground mb-4">
                          {post.title}
                        </h1>

                        {/* Meta Information */}
                        <div
                          className="flex flex-wrap items-center
                        gap-4 text-sm text-muted-foreground"
                        >
                          {/* Author */}
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>
                              {post.author?.firstName} {post.author?.lastName}
                            </span>
                          </div>

                          {/* Published Date */}
                          {post.publishedAt && (
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span>
                                {format(
                                  new Date(post.publishedAt),
                                  'MMMM d, yyyy'
                                )}
                              </span>
                            </div>
                          )}

                          {/* Reading Time (estimated) */}
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>
                              {Math.ceil(post.content.split(' ').length / 200)}{' '}
                              min read
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-border mb-6" />

                      {/* Post Content */}
                      <div className="prose prose-lg dark:prose-invert max-w-none mb-8">
                        <div
                          className="text-foreground leading-relaxed whitespace-pre-wrap"
                          style={{ wordBreak: 'break-word' }}
                        >
                          {post.content}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-3 pt-6 border-t border-border">
                        <Button
                          variant="outline"
                          onClick={handleShare}
                          className="flex-1 md:flex-initial"
                        >
                          <Share2 className="h-4 w-4 mr-2" />
                          Share
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Author Card */}
                {post.author && (
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div
                          className="w-16 h-16 rounded-full bg-primary/10
                        flex items-center justify-center flex-shrink-0"
                        >
                          <User className="h-8 w-8 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground mb-1">
                            {post.author.firstName} {post.author.lastName}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Author
                          </p>
                          {post.author.email && (
                            <p className="text-sm text-muted-foreground mt-2">
                              {post.author.email}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Related Store Info */}
                {store && (
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {store.logoUrl ? (
                            <img
                              src={store.logoUrl}
                              alt={store.name}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                          ) : (
                            <div
                              className="w-12 h-12 rounded-lg bg-muted
                            flex items-center justify-center"
                            >
                              <span className="text-lg font-bold text-muted-foreground">
                                {store.name[0]}
                              </span>
                            </div>
                          )}
                          <div>
                            <h4 className="font-semibold text-foreground">
                              {store.name}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {store.description?.substring(0, 60)}...
                            </p>
                          </div>
                        </div>
                        <Link
                          to={buildUrl(ROUTES.STORE_PUBLIC, {
                            storeId: storeId!,
                          })}
                        >
                          <Button variant="outline">Visit Store</Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </QueryLoader>
        </div>
      </div>
    </ErrorBoundary>
  );
}
