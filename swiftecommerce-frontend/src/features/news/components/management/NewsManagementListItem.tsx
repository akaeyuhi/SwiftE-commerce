import { Card, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { NewsPost } from '@/features/news/types/news.types';
import { Calendar, Edit, Trash2, Eye, User } from 'lucide-react';
import { useNavigate } from '@/shared/hooks/useNavigate';
import { Badge } from '@/shared/components/ui/Badge';
import { format } from 'date-fns';

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
  const {
    storeId,
    id,
    title,
    createdAt,
    publishedAt,
    content,
    isPublished,
    mainPhotoUrl,
    author,
  } = news;

  // Truncate content for preview
  const truncatedContent =
    content.length > 150 ? content.substring(0, 150) + '...' : content;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row">
          {/* Image Thumbnail */}
          {mainPhotoUrl ? (
            <div className="md:w-48 aspect-video md:aspect-square overflow-hidden flex-shrink-0">
              <img
                src={mainPhotoUrl}
                alt={title}
                className="w-full h-full object-cover hover:scale-105
                transition-transform duration-300"
              />
            </div>
          ) : (
            <div
              className="md:w-48 aspect-video md:aspect-square
            bg-muted flex items-center justify-center flex-shrink-0"
            >
              <Eye className="h-12 w-12 text-muted-foreground/30" />
            </div>
          )}

          {/* Content */}
          <div className="flex-1 p-6">
            {/* Header with Title and Status */}
            <div className="flex items-start justify-between gap-4 mb-3">
              <h3 className="text-xl font-semibold text-foreground line-clamp-2 flex-1">
                {title}
              </h3>
              <Badge
                variant={isPublished ? 'default' : 'secondary'}
                className="flex-shrink-0"
              >
                {isPublished ? 'Published' : 'Draft'}
              </Badge>
            </div>

            {/* Meta Information */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
              {/* Author */}
              {author && (
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>
                    {author.firstName} {author.lastName}
                  </span>
                </div>
              )}

              {/* Created Date */}
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>
                  Created {format(new Date(createdAt), 'MMM d, yyyy')}
                </span>
              </div>

              {/* Published Date */}
              {publishedAt && (
                <div className="flex items-center gap-1">
                  <span className="text-xs">
                    Published {format(new Date(publishedAt), 'MMM d, yyyy')}
                  </span>
                </div>
              )}
            </div>

            {/* Content Preview */}
            <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
              {truncatedContent}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              {/* View Button */}
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate.to(`/store/${storeId}/news/${id}`)}
              >
                <Eye className="h-4 w-4 mr-2" />
                View
              </Button>

              {/* Edit Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate.to(`/store/${storeId}/news/${id}/edit`)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>

              {/* Publish/Unpublish Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPublishToggle(id, isPublished)}
                disabled={isToggling}
                className={
                  isPublished
                    ? 'text-yellow-600 hover:text-yellow-700 ' +
                      'hover:bg-yellow-50 dark:hover:bg-yellow-950'
                    : 'text-green-600 hover:text-green-700 ' +
                      'hover:bg-green-50 dark:hover:bg-green-950'
                }
              >
                {isToggling ? (
                  <span className="flex items-center gap-2">
                    <span
                      className="animate-spin h-4 w-4 border-2 border-current
                    border-t-transparent rounded-full"
                    />
                    {isPublished ? 'Unpublishing...' : 'Publishing...'}
                  </span>
                ) : (
                  <>{isPublished ? 'Unpublish' : 'Publish'}</>
                )}
              </Button>

              {/* Delete Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(id)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 ml-auto"
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
