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
import { mockReviews } from '@/shared/mocks/reviews.mock';
import { MessageSquare, Star, TrendingUp, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export function ReviewManagementPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRating, setFilterRating] = useState('all');

  // Filter reviews for this store
  const storeReviews = mockReviews.filter((r) => r.storeId === storeId);

  const filteredReviews = storeReviews.filter((review) => {
    const matchesSearch =
      review.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.author.name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRating =
      filterRating === 'all' || review.rating === parseInt(filterRating);

    return matchesSearch && matchesRating;
  });

  const stats = [
    {
      title: 'Total Reviews',
      value: storeReviews.length,
      icon: MessageSquare,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Average Rating',
      value: '4.7',
      icon: Star,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      title: 'Response Rate',
      value: '95%',
      icon: TrendingUp,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Pending',
      value: storeReviews.filter((r) => r.rating <= 3).length,
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
      {filteredReviews.length === 0 ? (
        <Card>
          <EmptyState
            icon={MessageSquare}
            title="No reviews found"
            description="Try adjusting your filters"
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredReviews.map((review) => (
            <Card key={review.id} className="p-6">
              <div className="mb-4">
                <p className="text-sm font-medium text-foreground mb-1">
                  Product: {review.productName}
                </p>
              </div>
              <ReviewCard
                {...review}
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
    </div>
  );
}
