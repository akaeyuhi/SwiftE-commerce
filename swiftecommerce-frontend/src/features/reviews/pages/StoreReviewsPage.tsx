import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { StatsGrid } from '@/shared/components/ui/StatsGrid';
import { SearchBar } from '@/shared/components/ui/SearchBar';
import { ReviewCard } from '../components/ReviewCard';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Star, MessageSquare, TrendingUp } from 'lucide-react';
import { mockReviews as reviews } from '@/shared/mocks/reviews.mock.ts';

export function StoreReviewsPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRating, setFilterRating] = useState('all');
  const [sortBy, setSortBy] = useState('recent');

  console.log(storeId);

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
      value: '4.8',
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
      title: '5-Star Reviews',
      value: reviews.filter((r) => r.rating === 5).length,
      icon: Star,
      color: 'text-info',
      bgColor: 'bg-info/10',
    },
  ];

  const filteredReviews = reviews
    .filter((review) => {
      const matchesSearch =
        review.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        review.author.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRating =
        filterRating === 'all' || review.rating === parseInt(filterRating);
      return matchesSearch && matchesRating;
    })
    .sort((a, b) => {
      if (sortBy === 'recent') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      } else if (sortBy === 'helpful') {
        return b.helpfulCount - a.helpfulCount;
      } else if (sortBy === 'rating') {
        return b.rating - a.rating;
      }
      return 0;
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Customer Reviews
        </h1>
        <p className="text-muted-foreground">
          Manage and respond to customer feedback
        </p>
      </div>

      {/* Stats */}
      <StatsGrid stats={stats} columns={4} />

      {/* Rating Distribution */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold text-foreground mb-4">
            Rating Distribution
          </h3>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = reviews.filter((r) => r.rating === rating).length;
              const percentage = (count / reviews.length) * 100;

              return (
                <div key={rating} className="flex items-center gap-4">
                  <div className="flex items-center gap-1 w-20">
                    <span className="text-sm font-medium text-foreground">
                      {rating}
                    </span>
                    <Star className="h-4 w-4 fill-warning text-warning" />
                  </div>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-warning"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground w-12">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <SearchBar
              placeholder="Search reviews..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Select value={filterRating} onValueChange={setFilterRating}>
              <SelectTrigger className="w-full md:w-40">
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
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="helpful">Most Helpful</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      {filteredReviews.length === 0 ? (
        <Card>
          <EmptyState
            icon={MessageSquare}
            title="No reviews found"
            description="Try adjusting your filters or search query"
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredReviews.map((review) => (
            <ReviewCard key={review.id} {...review} />
          ))}
        </div>
      )}
    </div>
  );
}
