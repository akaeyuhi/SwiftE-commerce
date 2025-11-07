import { useState } from 'react';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Star } from 'lucide-react';
import { useAuth } from '@/app/store';
import {
  ReviewForm,
  ReviewFormData,
} from '@/features/reviews/components/ReviewForm';
import { ReviewsList } from '@/features/reviews/components/ReviewsList';
import {
  useReviewMutations,
  useReviews,
} from '@/features/reviews/hooks/useReviews';
import { toast } from 'sonner';

interface CustomerReviewsProps {
  productId: string;
  storeId: string;
  productName: string;
  averageRating: number;
  reviewCount: number;
}

export function CustomerReviews({
  productId,
  storeId,
  productName,
  averageRating,
  reviewCount,
}: CustomerReviewsProps) {
  const { isAuthenticated } = useAuth();
  const [showReviewForm, setShowReviewForm] = useState(false);
  const { data: reviews } = useReviews(storeId, productId);
  const { createReview } = useReviewMutations(storeId, productId);

  const handleReviewSubmit = async (data: ReviewFormData) => {
    await createReview.mutateAsync(data, {
      onSuccess: () => {
        setShowReviewForm(false);
      },
    });
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Customer Reviews
            </h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Star className="h-5 w-5 fill-warning text-warning" />
                <span className="font-semibold text-foreground">
                  {averageRating}
                </span>
                <span className="text-sm text-muted-foreground">
                  ({reviewCount} reviews)
                </span>
              </div>
            </div>
          </div>
          {isAuthenticated && !showReviewForm && (
            <Button onClick={() => setShowReviewForm(true)}>
              Write a Review
            </Button>
          )}
        </div>

        {showReviewForm && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <h3 className="font-semibold text-foreground mb-4">
                Write Your Review for {productName}
              </h3>
              <ReviewForm
                onSubmit={handleReviewSubmit}
                onCancel={() => setShowReviewForm(false)}
                isLoading={createReview.isPending}
              />
            </CardContent>
          </Card>
        )}

        <ReviewsList
          reviews={reviews?.data || []}
          onMarkHelpful={() => {
            toast.success('Marked as helpful');
          }}
        />
      </CardContent>
    </Card>
  );
}
