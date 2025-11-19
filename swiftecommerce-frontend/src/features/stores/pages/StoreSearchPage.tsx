import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStoreSearch } from '../hooks/useStores';
import { QueryLoader } from '@/shared/components/loaders/QueryLoader';
import { StoresGrid } from '../components/grid-list/StoresGrid';
import { Pagination } from '@/shared/components/ui/Pagination';
import { Button } from '@/shared/components/ui/Button';
import { Store } from '@/features/stores/types/store.types.ts';
import { StoreFiltersSidebar } from '../components/filter/StoreFiltersSidebar';
import { ErrorBoundary } from '@/shared/components/errors/ErrorBoundary';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useDebounce } from '@/shared/hooks/useDebounce';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select.tsx';
import { FormField } from '@/shared/components/forms/FormField.tsx';
import { Input } from '@/shared/components/forms/Input.tsx';

export function StoreSearchPage() {
  const [searchParams] = useSearchParams();
  const urlQuery = searchParams.get('q') || '';

  const [searchQuery, setSearchQuery] = useState(urlQuery);
  const [sortBy, setSortBy] = useState<
    'name' | 'revenue' | 'followers' | 'products' | 'recent'
  >('recent');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [revenueRange, setRevenueRange] = useState({ min: 0, max: 1000000 });
  const [productRange, setProductRange] = useState({ min: 0, max: 1000 });
  const [followerRange, setFollowerRange] = useState({ min: 0, max: 10000 });
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 9;

  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    setPage(1);
  }, [
    debouncedSearch,
    sortBy,
    sortOrder,
    revenueRange,
    productRange,
    followerRange,
  ]);

  // Sync URL search param
  useEffect(() => {
    setSearchQuery(urlQuery);
  }, [urlQuery]);

  const { data, isLoading, error, refetch } = useStoreSearch({
    query: debouncedSearch,
    minRevenue: revenueRange.min > 0 ? revenueRange.min : undefined,
    maxRevenue: revenueRange.max < 1000000 ? revenueRange.max : undefined,
    minProducts: productRange.min > 0 ? productRange.min : undefined,
    maxProducts: productRange.max < 1000 ? productRange.max : undefined,
    minFollowers: followerRange.min > 0 ? followerRange.min : undefined,
    maxFollowers: followerRange.max < 10000 ? followerRange.max : undefined,
    sortBy,
    sortOrder,
    limit,
    offset: (page - 1) * limit,
  });

  const stores = data?.data || [];
  const total = data?.meta.total || 0;
  const totalPages = data?.meta.totalPages || Math.ceil(total / limit);

  function hasActiveFilters() {
    return (
      revenueRange.min > 0 ||
      revenueRange.max < 1000000 ||
      productRange.min > 0 ||
      productRange.max < 1000 ||
      followerRange.min > 0 ||
      followerRange.max < 10000
    );
  }

  function clearFilters() {
    setRevenueRange({ min: 0, max: 1000000 });
    setProductRange({ min: 0, max: 1000 });
    setFollowerRange({ min: 0, max: 10000 });
    setSortBy('recent');
    setSortOrder('DESC');
  }

  const handleSortChange = (value: string) => {
    const [newSortBy, newSortOrder] = value.split('-');
    setSortBy(newSortBy as any);
    setSortOrder(newSortOrder as 'ASC' | 'DESC');
  };

  return (
    <ErrorBoundary title="Store Search Error">
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {debouncedSearch
                ? `Search Results for "${debouncedSearch}"`
                : 'Browse Stores'}
            </h1>
            <p className="text-muted-foreground">
              {total} {total === 1 ? 'store' : 'stores'} found
            </p>
          </div>

          {/* Search & Sort Bar */}
          <div className="mb-6 flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search
                className="absolute left-3 top-1/2
              -translate-y-1/2 h-5 w-5 text-muted-foreground"
              />
              <FormField>
                <Input
                  type="text"
                  placeholder="Search stores by name or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-muted border border-input rounded-lg
                  text-foreground placeholder:text-muted-foreground
                  focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent
                  transition-shadow"
                />
              </FormField>
            </div>

            <div className="flex gap-2">
              <Select
                value={`${sortBy}-${sortOrder}`}
                onValueChange={handleSortChange}
              >
                <SelectTrigger
                  className="w-48 px-3 py-2 bg-muted border
                border-input rounded-lg text-sm"
                >
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent-DESC">Most Recent</SelectItem>
                  <SelectItem value="name-ASC">Name: A-Z</SelectItem>
                  <SelectItem value="name-DESC">Name: Z-A</SelectItem>
                  <SelectItem value="revenue-DESC">
                    Revenue: High to Low
                  </SelectItem>
                  <SelectItem value="revenue-ASC">
                    Revenue: Low to High
                  </SelectItem>
                  <SelectItem value="followers-DESC">Most Followers</SelectItem>
                  <SelectItem value="products-DESC">Most Products</SelectItem>
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

          {/* Main Content */}
          <div className="flex flex-col md:flex-row gap-6">
            {/* Filters Sidebar */}
            <div className={`${showFilters ? 'block' : 'hidden'} md:block`}>
              <StoreFiltersSidebar
                revenueRange={revenueRange}
                setRevenueRange={setRevenueRange}
                productRange={productRange}
                setProductRange={setProductRange}
                followerRange={followerRange}
                setFollowerRange={setFollowerRange}
                clearFilters={clearFilters}
                hasActiveFilters={hasActiveFilters()}
              />
            </div>

            {/* Results Grid */}
            <div className="flex-1">
              <QueryLoader
                isLoading={isLoading}
                error={error}
                refetch={refetch}
                loadingMessage="Searching stores..."
              >
                {stores.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground mb-4">
                      {debouncedSearch
                        ? `No stores found matching "${debouncedSearch}"`
                        : 'No stores found'}
                    </p>
                    {hasActiveFilters() && (
                      <Button variant="outline" onClick={clearFilters}>
                        Clear Filters
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-8">
                    <StoresGrid stores={stores as Store[]} />
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
