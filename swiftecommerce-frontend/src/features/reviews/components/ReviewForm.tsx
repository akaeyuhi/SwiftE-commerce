import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/shared/components/ui/Button';
import { Textarea } from '@/shared/components/forms/Textarea';
import { FormField } from '@/shared/components/forms/FormField';
import { Star } from 'lucide-react';
import { useState } from 'react';

const reviewSchema = z.object({
  rating: z.number().min(1, 'Please select a rating').max(5),
  content: z.string().min(10, 'Review must be at least 10 characters'),
});

export type ReviewFormData = z.infer<typeof reviewSchema>;

interface ReviewFormProps {
  onSubmit: (data: ReviewFormData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function ReviewForm({
  onSubmit,
  onCancel,
  isLoading = false,
}: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: 0,
      content: '',
    },
  });

  const handleRatingClick = (value: number) => {
    setRating(value);
    setValue('rating', value, { shouldValidate: true });
  };

  const handleFormSubmit = async (data: ReviewFormData) => {
    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <FormField label="Your Rating" error={errors.rating} required>
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => handleRatingClick(value)}
              onMouseEnter={() => setHoverRating(value)}
              onMouseLeave={() => setHoverRating(0)}
              className="transition-transform hover:scale-110"
            >
              <Star
                className={`h-8 w-8 ${
                  value <= (hoverRating || rating)
                    ? 'fill-warning text-warning'
                    : 'text-muted-foreground'
                }`}
              />
            </button>
          ))}
          {rating > 0 && (
            <span className="text-sm text-muted-foreground ml-2">
              {rating} {rating === 1 ? 'star' : 'stars'}
            </span>
          )}
        </div>
      </FormField>

      <FormField label="Your Review" error={errors.content} required>
        <Textarea
          {...register('content')}
          placeholder="Share your experience with this product..."
          rows={5}
          error={!!errors.content}
        />
      </FormField>

      <div className="flex gap-3">
        <Button type="submit" loading={isLoading} disabled={rating === 0}>
          Submit Review
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
