import { Badge } from '@/shared/components/ui/Badge';
import { Star, ThumbsUp } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';

interface ReviewCardProps {
  id: string;
  author: {
    name: string;
    avatar?: string | null;
  };
  rating: number;
  date: string;
  content: string;
  helpfulCount: number;
  verified: boolean;
  onMarkHelpful?: (id: string) => void;
}

export function ReviewCard({
  id,
  author,
  rating,
  date,
  content,
  helpfulCount,
  verified,
  onMarkHelpful,
}: ReviewCardProps) {
  return (
    <div className="p-6 border border-border rounded-lg">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-semibold text-primary">
              {author.name.toUpperCase()}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-foreground">{author.name}</p>
              {verified && (
                <Badge variant="success" className="text-xs">
                  Verified Purchase
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {new Date(date).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Rating */}
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`h-4 w-4 ${
                i < rating
                  ? 'fill-warning text-warning'
                  : 'text-muted-foreground'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <p className="text-foreground mb-4">{content}</p>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => onMarkHelpful?.(id)}>
          <ThumbsUp className="h-4 w-4 mr-2" />
          Helpful ({helpfulCount})
        </Button>
      </div>
    </div>
  );
}
