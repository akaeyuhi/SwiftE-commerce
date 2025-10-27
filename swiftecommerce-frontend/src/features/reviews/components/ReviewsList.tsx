import { ReviewCard } from './ReviewCard';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { MessageSquare } from 'lucide-react';

interface Review {
  id: string;
  author: {
    name: string;
    avatar?: string;
  };
  rating: number;
  date: string;
  content: string;
  helpfulCount: number;
  verified: boolean;
}

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
        <ReviewCard key={review.id} {...review} onMarkHelpful={onMarkHelpful} />
      ))}
    </div>
  );
}
