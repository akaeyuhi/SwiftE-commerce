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

interface ProductFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  sortBy: string;
  setSortBy: (sortBy: string) => void;
  categories: CategoryDto[];
}

export function ProductFilters({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  sortBy,
  setSortBy,
  categories,
}: ProductFiltersProps) {
  const hasActiveFilters = searchQuery || selectedCategory !== 'all';

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search
              className="absolute left-3 top-1/2
            -translate-y-1/2 h-4 w-4 text-muted-foreground"
            />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => {
                console.log('Search input changed:', e.target.value);
                setSearchQuery(e.target.value);
              }}
              className="pl-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2
                 hover:bg-muted rounded-full p-1"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Sort Select */}
          <div className="flex gap-2">
            <Select
              value={sortBy}
              onValueChange={(value) => {
                console.log('Sort changed:', value);
                setSortBy(value);
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popular">Popular</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
              >
                Clear All
              </Button>
            )}
          </div>
        </div>

        <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
          <Button
            variant={selectedCategory === 'all' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => {
              console.log('Category changed: all');
              setSelectedCategory('all');
            }}
          >
            All
          </Button>
          {categories &&
            categories
              .filter((cat) => !cat.parentId)
              .map((category) => (
                <Button
                  key={category.id}
                  variant={
                    selectedCategory === category.id ? 'primary' : 'outline'
                  }
                  size="sm"
                  onClick={() => {
                    console.log(
                      'Category changed:',
                      category.id,
                      category.name
                    );
                    setSelectedCategory(category.id);
                  }}
                >
                  {category.name}
                </Button>
              ))}
        </div>
      </CardContent>
    </Card>
  );
}
