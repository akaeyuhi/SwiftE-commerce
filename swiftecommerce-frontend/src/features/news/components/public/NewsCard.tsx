import { Card, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { NewsPost } from '@/features/news/types/news.types';
import { Calendar, User, ArrowRight } from 'lucide-react';
import { Link } from '@/shared/components/ui/Link';
import { format } from 'date-fns';

interface NewsCardProps {
  news: NewsPost;
}

export function NewsCard({ news }: NewsCardProps) {
  const { id, title, content, author, publishedAt, mainPhotoUrl, storeId } =
    news;

  // Truncate content
  const truncatedContent =
    content.length > 200 ? content.substring(0, 200) + '...' : content;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row">
          {/* Image */}
          {mainPhotoUrl && (
            <div className="md:w-1/3 aspect-video md:aspect-square overflow-hidden">
              <img
                src={mainPhotoUrl}
                alt={title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Content */}
          <div
            className={`flex-1 p-6 ${!mainPhotoUrl ? 'md:col-span-full' : ''}`}
          >
            <h2
              className="text-2xl font-bold text-foreground
            mb-3 hover:text-primary transition-colors"
            >
              <Link to={`/store/${storeId}/news/${id}`}>{title}</Link>
            </h2>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {author.firstName} {author.lastName}
              </div>
              {publishedAt && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(publishedAt), 'MMM d, yyyy')}
                </div>
              )}
            </div>

            <p className="text-muted-foreground mb-4 line-clamp-3">
              {truncatedContent}
            </p>

            <Link to={`/store/${storeId}/news/${id}`}>
              <Button variant="outline" size="sm">
                Read More
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
