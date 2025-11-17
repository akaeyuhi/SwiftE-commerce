import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/shared/components/ui/Button';
import { Card } from '@/shared/components/ui/Card';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { SearchBar } from '@/shared/components/ui/SearchBar';
import { StatsGrid } from '@/shared/components/ui/StatsGrid';
import { ReviewCard } from '../components/ReviewCard';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { MessageSquare, Star, TrendingUp, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useProduct, useProducts } from '@/features/products/hooks/useProducts';
import { useReviews } from '../hooks/useReviews';
import { QueryLoader } from '@/shared/components/loaders/QueryLoader';
import { Product } from '@/features/products/types/product.types';

export function ReviewManagementPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRating, setFilterRating] = useState('all');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null
  );

  const {
    data: productsData,
    isLoading: productsLoading,
    error: productsError,
  } = useProducts(storeId!);
  const products = productsData?.data || [];

  const {
    data: reviewsData,
    isLoading: reviewsLoading,
    error: reviewsError,
  } = useReviews(storeId!, selectedProductId!, {
    enabled: !!selectedProductId,
  });
  const { data: selectedProduct } = useProduct(storeId!, selectedProductId!);
  const reviews = reviewsData?.data || [];

  const filteredReviews = reviews.filter((review) => {
    const matchesSearch =
      review.comment?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${review.user.firstName} ${review.user.lastName}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

    const matchesRating =
      filterRating === 'all' || review.rating === parseInt(filterRating);

    return matchesSearch && matchesRating;
  });

  const stats = [
    {
      title: 'Total Reviews',
      value: reviews.length,
      icon: MessageSquare,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Average Rating',
      value: (
        reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length || 0
      ).toFixed(1),
      icon: Star,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      title: 'Response Rate',
      value: 'N/A',
      icon: TrendingUp,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Pending',
      value: reviews.filter((r) => r.rating <= 3).length,
      icon: AlertTriangle,
      color: 'text-error',
      bgColor: 'bg-error/10',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Review Management
        </h1>
        <p className="text-muted-foreground">
          Monitor and respond to customer reviews
        </p>
      </div>

      {/* Stats */}
      <StatsGrid stats={stats} columns={4} />

      {/* Filters */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <QueryLoader isLoading={productsLoading} error={productsError}>
            <Select
              onValueChange={setSelectedProductId}
              defaultValue={selectedProductId || undefined}
            >
              <SelectTrigger className="w-full md:w-64">
                <SelectValue placeholder="Select a product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product: Product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </QueryLoader>
          <SearchBar
            placeholder="Search reviews..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Select value={filterRating} onValueChange={setFilterRating}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ratings</SelectItem>
              <SelectItem value="5">5 Stars</SelectItem>
              <SelectItem value="4">4 Stars</SelectItem>
              <SelectItem value="3">3 Stars</SelectItem>
              <SelectItem value="2">2 Stars</SelectItem>
              <SelectItem value="1">1 Star</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Reviews */}
      <QueryLoader isLoading={reviewsLoading} error={reviewsError}>
        {filteredReviews.length === 0 ? (
          <Card>
            <EmptyState
              icon={MessageSquare}
              title="No reviews found"
              description={
                selectedProductId
                  ? 'This product has no reviews yet.'
                  : 'Select a product to see reviews.'
              }
            />
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredReviews.map((review) => (
              <Card key={review.id} className="p-6">
                <div className="mb-4">
                  <p className="text-sm font-medium text-foreground mb-1">
                    Product: {selectedProduct?.name}
                  </p>
                </div>
                <ReviewCard
                  id={review.id}
                  user={{
                    firstName: review.user.firstName,
                    lastName: review.user.lastName,
                  }}
                  rating={review.rating}
                  date={review.createdAt.toString()}
                  comment={review.comment || ''}
                  helpfulCount={0}
                  verified={true}
                  onMarkHelpful={() => toast.success('Marked as helpful')}
                />
                <div className="mt-4 pt-4 border-t border-border">
                  <Button variant="outline" size="sm">
                    Respond to Review
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </QueryLoader>
    </div>
  );
}
