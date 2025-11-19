import { Card, CardContent } from '@/shared/components/ui/Card.tsx';
import { Input } from '@/shared/components/forms/Input.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select.tsx';
import { Search, X } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button.tsx';
import { CategoryDto } from '@/features/categories/types/categories.types.ts';
import { useState, useEffect } from 'react';

interface ProductFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  sortBy: 'relevance' | 'views' | 'sales' | 'rating' | 'price' | 'recent';
  setSortBy: (
    sortBy: 'relevance' | 'views' | 'sales' | 'rating' | 'price' | 'recent'
  ) => void;
  categories: CategoryDto[];
  isLoading?: boolean;
}

export function ProductFilters({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  sortBy,
  setSortBy,
  categories,
  isLoading = false,
}: ProductFiltersProps) {
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

  useEffect(() => {
    setLocalSearchQuery(searchQuery);
  }, [searchQuery]);

  const handleSearchChange = (value: string) => {
    setLocalSearchQuery(value);
    setSearchQuery(value);
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' || selectedCategory !== 'all';

  const clearFilters = () => {
    setLocalSearchQuery('');
    setSearchQuery('');
    setSelectedCategory('all');
    setSortBy('relevance');
  };

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search
              className="absolute left-3 top-1/2
            -translate-y-1/2 h-4 w-4 text-muted-foreground"
            />
            <Input
              placeholder="Search products..."
              value={localSearchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 pr-10"
              disabled={isLoading}
            />
            {localSearchQuery && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2
                hover:bg-muted rounded-full p-1 transition-colors"
                aria-label="Clear search"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Most Relevant</SelectItem>
                <SelectItem value="recent">Newest First</SelectItem>
                <SelectItem value="price">Price</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="views">Most Viewed</SelectItem>
                <SelectItem value="sales">Best Selling</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button
                variant="outline"
                size="md"
                onClick={clearFilters}
                disabled={isLoading}
                className="border"
              >
                <X className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            )}
          </div>
        </div>

        {/* Category Filters */}
        {categories && categories.length > 0 && (
          <div className="mt-4">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
              <Button
                variant={selectedCategory === 'all' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('all')}
                disabled={isLoading}
              >
                All Products
              </Button>
              {categories
                .filter((cat) => !cat.parentId)
                .map((category) => (
                  <Button
                    key={category.id}
                    variant={
                      selectedCategory === category.id ? 'primary' : 'outline'
                    }
                    size="sm"
                    onClick={() => setSelectedCategory(category.id)}
                    disabled={isLoading}
                  >
                    {category.name}
                  </Button>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
