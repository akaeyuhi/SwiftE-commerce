import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAllProducts } from '../hooks/useProducts';
import { ErrorBoundary } from '@/shared/components/errors/ErrorBoundary';
import { QueryLoader } from '@/shared/components/loaders/QueryLoader';
import { ProductsPageHeader } from '../components/header/ProductsPageHeader';
import { ProductFiltersSidebar } from '../components/filter/ProductFiltersSidebar';
import { ProductGrid } from '../components/grid/ProductGrid';
import { Button } from '@/shared/components/ui/Button';
import { SlidersHorizontal } from 'lucide-react';

export function ProductsPage() {
  const [searchParams] = useSearchParams();
  const urlSearch = searchParams.get('search') || '';
  const [searchQuery, setSearchQuery] = useState(urlSearch);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [priceRange, setPriceRange] = useState({ min: 0, max: 10000 });
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading, error, refetch } = useAllProducts({
    search: searchQuery,
    categoryId: selectedCategory === 'all' ? undefined : selectedCategory,
    sortBy,
    minPrice: priceRange.min,
    maxPrice: priceRange.max,
  });

  const clearFilters = () => {
    setSelectedCategory('all');
    setPriceRange({ min: 0, max: 10000 });
    setSearchQuery('');
  };

  const hasActiveFilters =
    selectedCategory !== 'all' ||
    priceRange.min > 0 ||
    priceRange.max < 10000 ||
    searchQuery !== '';

  const products = data?.data;

  useEffect(() => {
    setSearchQuery(urlSearch);
  }, [urlSearch]);

  //TODO pagination

  return (
    <ErrorBoundary title="Products Page Error">
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <ProductsPageHeader />

          <div className="mb-6 flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-muted border
                border-input rounded-lg text-foreground
                placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring
                focus:border-transparent transition-shadow"
              />
            </div>

            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-48 px-3 py-2 bg-muted border border-input rounded-lg text-sm"
              >
                <option value="newest">Newest First</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
                <option value="popular">Most Popular</option>
              </select>

              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="md:hidden"
              >
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            <ProductFiltersSidebar
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              priceRange={priceRange}
              setPriceRange={setPriceRange}
              clearFilters={clearFilters}
              hasActiveFilters={hasActiveFilters}
            />

            <div className="flex-1">
              <QueryLoader
                isLoading={isLoading}
                error={error}
                refetch={refetch}
                loadingMessage="Loading products..."
              >
                <ProductGrid products={products || []} />
              </QueryLoader>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
