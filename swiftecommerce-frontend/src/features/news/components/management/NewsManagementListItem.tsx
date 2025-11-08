import { Card, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { NewsPost } from '@/features/news/types/news.types';
import { Calendar, Edit, Trash2 } from 'lucide-react';
import { useNavigate } from '@/shared/hooks/useNavigate';
import { Badge } from '@/shared/components/ui/Badge';

interface NewsManagementListItemProps {
  news: NewsPost;
  onDelete: (id: string) => void;
  onPublishToggle: (id: string, isPublished: boolean) => void;
  isToggling: boolean;
}

export function NewsManagementListItem({
  news,
  onDelete,
  onPublishToggle,
  isToggling,
}: NewsManagementListItemProps) {
  const navigate = useNavigate();
  const { storeId, id, title, createdAt, content, isPublished } = news;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {title}
              </h3>
              <Badge variant={isPublished ? 'success' : 'secondary'}>
                {isPublished ? 'Published' : 'Draft'}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(createdAt).toLocaleDateString()}
              </div>
            </div>

            <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
              {content}
            </p>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate.to(`/store/${storeId}/news/${id}/edit`)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPublishToggle(id, isPublished)}
                loading={isToggling}
              >
                {isPublished ? 'Unpublish' : 'Publish'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(id)}
                className="text-error hover:text-error hover:bg-error/10"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
