import { ReviewCard } from './ReviewCard';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { MessageSquare } from 'lucide-react';
import { Review } from '@/features/reviews/types/reviews.types.ts';

interface ReviewsListProps {
  reviews: Review[];
  onMarkHelpful?: (reviewId: string) => void;
}

export function ReviewsList({ reviews, onMarkHelpful }: ReviewsListProps) {
  if (reviews.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="No reviews yet"
        description="Be the first to review this product"
      />
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <ReviewCard
          key={review.id}
          {...(review as any)}
          onMarkHelpful={onMarkHelpful}
        />
      ))}
    </div>
  );
}
