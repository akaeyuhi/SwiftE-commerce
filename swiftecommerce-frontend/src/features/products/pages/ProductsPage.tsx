import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useProductSearch } from '../hooks/useProducts';
import { ErrorBoundary } from '@/shared/components/errors/ErrorBoundary';
import { QueryLoader } from '@/shared/components/loaders/QueryLoader';
import { ProductsPageHeader } from '../components/header/ProductsPageHeader';
import { ProductFiltersSidebar } from '../components/filter/ProductFiltersSidebar';
import { ProductGrid } from '../components/grid/ProductGrid';
import { Pagination } from '@/shared/components/ui/Pagination';
import { Button } from '@/shared/components/ui/Button';
import { SlidersHorizontal, Search } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select.tsx';
import { Input } from '@/shared/components/forms/Input.tsx';
import { useDebounce } from '@/shared/hooks/useDebounce';

export function ProductsPage() {
  const [searchParams] = useSearchParams();
  const urlSearch = searchParams.get('search') || '';

  // State
  const [searchQuery, setSearchQuery] = useState(urlSearch);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<
    'recent' | 'price' | 'rating' | 'views' | 'sales'
  >('recent');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [priceRange, setPriceRange] = useState({ min: 0, max: 10000 });
  const [ratingRange, setRatingRange] = useState({ min: 0, max: 5 });
  const [inStockOnly, setInStockOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 12;

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [
    debouncedSearch,
    selectedCategories,
    sortBy,
    sortOrder,
    priceRange,
    ratingRange,
    inStockOnly,
  ]);

  // Sync URL search param
  useEffect(() => {
    setSearchQuery(urlSearch);
  }, [urlSearch]);

  const { data, isLoading, error, refetch } = useProductSearch({
    query: debouncedSearch,
    categoryIds: selectedCategories.length > 0 ? selectedCategories : undefined,
    minPrice: priceRange.min > 0 ? priceRange.min : undefined,
    maxPrice: priceRange.max < 10000 ? priceRange.max : undefined,
    minRating: ratingRange.min > 0 ? ratingRange.min : undefined,
    maxRating: ratingRange.max < 5 ? ratingRange.max : undefined,
    inStock: inStockOnly,
    sortBy,
    sortOrder,
    limit,
    offset: (page - 1) * limit,
  });

  const products = data?.data || [];
  const total = data?.meta.total || 0;
  const totalPages = data?.meta.totalPages || Math.ceil(total / limit);

  const clearFilters = () => {
    setSelectedCategories([]);
    setPriceRange({ min: 0, max: 10000 });
    setRatingRange({ min: 0, max: 5 });
    setInStockOnly(false);
    setSearchQuery('');
    setSortBy('recent');
    setSortOrder('DESC');
  };

  const hasActiveFilters =
    selectedCategories.length > 0 ||
    priceRange.min > 0 ||
    priceRange.max < 10000 ||
    ratingRange.min > 0 ||
    ratingRange.max < 5 ||
    inStockOnly ||
    searchQuery !== '';

  const handleSortChange = (value: string) => {
    const [newSortBy, newSortOrder] = value.split('-');
    setSortBy(newSortBy as any);
    setSortOrder(newSortOrder as 'ASC' | 'DESC');
  };

  return (
    <ErrorBoundary title="Products Page Error">
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <ProductsPageHeader />

          {/* Search & Sort Bar */}
          <div className="mb-6 flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search
                className="absolute left-3 top-1/2
              -translate-y-1/2 h-5 w-5 text-muted-foreground"
              />
              <Input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4"
              />
            </div>

            <div className="flex gap-2">
              <Select
                value={`${sortBy}-${sortOrder}`}
                onValueChange={handleSortChange}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent-DESC">Newest First</SelectItem>
                  <SelectItem value="price-ASC">Price: Low to High</SelectItem>
                  <SelectItem value="price-DESC">Price: High to Low</SelectItem>
                  <SelectItem value="rating-DESC">Highest Rated</SelectItem>
                  <SelectItem value="views-DESC">Most Viewed</SelectItem>
                  <SelectItem value="sales-DESC">Best Selling</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="md:hidden"
              >
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Results Count */}
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">
              {isLoading
                ? 'Searching...'
                : `${total} ${total === 1 ? 'product' : 'products'} found`}
            </p>
          </div>

          {/* Main Content */}
          <div className="flex flex-col md:flex-row gap-6">
            {/* Filters Sidebar */}
            <div className={`${showFilters ? 'block' : 'hidden'} md:block`}>
              <ProductFiltersSidebar
                products={products}
                selectedCategories={selectedCategories}
                setSelectedCategories={setSelectedCategories}
                priceRange={priceRange}
                setPriceRange={setPriceRange}
                ratingRange={ratingRange}
                setRatingRange={setRatingRange}
                inStockOnly={inStockOnly}
                setInStockOnly={setInStockOnly}
                clearFilters={clearFilters}
                hasActiveFilters={hasActiveFilters}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
              />
            </div>

            {/* Products Grid */}
            <div className="flex-1">
              <QueryLoader
                isLoading={isLoading}
                error={error}
                refetch={refetch}
                loadingMessage="Loading products..."
              >
                {products.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground mb-4">
                      {debouncedSearch
                        ? `No products found matching "${debouncedSearch}"`
                        : 'No products found'}
                    </p>
                    {hasActiveFilters && (
                      <Button variant="outline" onClick={clearFilters}>
                        Clear Filters
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-8">
                    <ProductGrid products={products} />
                    {totalPages > 1 && (
                      <Pagination
                        currentPage={page}
                        totalPages={totalPages}
                        onPageChange={setPage}
                      />
                    )}
                  </div>
                )}
              </QueryLoader>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
