import { Card, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { NewsPost } from '@/features/news/types/news.types';
import { Calendar, User } from 'lucide-react';

interface NewsCardProps {
  news: NewsPost;
}

export function NewsCard({ news }: NewsCardProps) {
  const { title, content, author, publishedAt } = news;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-foreground mb-2">{title}</h2>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {author.firstName} {author.lastName}
              </div>
              {publishedAt && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(publishedAt).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        </div>

        <p className="text-muted-foreground mb-4">{content}</p>

        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            Read More
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
