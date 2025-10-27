import { useEffect, useState } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { SearchBar } from '@/shared/components/ui/SearchBar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { useNavigate } from '@/shared/hooks/useNavigate';
import { mockProducts } from '@/shared/mocks/products.mock';
import { mockCategories } from '@/shared/mocks/categories.mock';
import { Package, Star, SlidersHorizontal, X } from 'lucide-react';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { useSearchParams } from 'react-router-dom';

type SortOption = 'newest' | 'price-asc' | 'price-desc' | 'rating' | 'popular';

export function ProductsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlSearch = searchParams.get('search') || '';
  const [searchQuery, setSearchQuery] = useState(urlSearch);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [priceRange, setPriceRange] = useState({ min: 0, max: 10000 });
  const [showFilters, setShowFilters] = useState(false);

  // Filter products
  let filteredProducts = mockProducts.filter((product) => {
    const matchesSearch = product.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'all' ||
      product.categories.some((cat) => cat.id === selectedCategory);

    const minPrice = Math.min(...product.variants.map((v) => v.price));
    const matchesPrice =
      minPrice >= priceRange.min && minPrice <= priceRange.max;

    return matchesSearch && matchesCategory && matchesPrice;
  });

  // Sort products
  filteredProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case 'price-asc':
        return (
          Math.min(...a.variants.map((v) => v.price)) -
          Math.min(...b.variants.map((v) => v.price))
        );
      case 'price-desc':
        return (
          Math.min(...b.variants.map((v) => v.price)) -
          Math.min(...a.variants.map((v) => v.price))
        );
      case 'rating':
        return b.averageRating - a.averageRating;
      case 'popular':
        return b.totalSales - a.totalSales;
      case 'newest':
      default:
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }
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

  useEffect(() => {
    setSearchQuery(urlSearch);
  }, [urlSearch]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            All Products
          </h1>
          <p className="text-muted-foreground">
            Browse our complete product catalog
          </p>
        </div>

        {/* Search & Filters Bar */}
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <SearchBar
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Select
              value={sortBy}
              onValueChange={(v) => setSortBy(v as SortOption)}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="price-asc">Price: Low to High</SelectItem>
                <SelectItem value="price-desc">Price: High to Low</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="popular">Most Popular</SelectItem>
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

        <div className="flex flex-col md:flex-row gap-6">
          {/* Filters Sidebar */}
          <aside
            className={`md:w-64 space-y-6 ${showFilters ? 'block' : 'hidden md:block'}`}
          >
            {/* Active Filters */}
            {hasActiveFilters && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-foreground text-sm">
                      Active Filters
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="text-xs"
                    >
                      Clear All
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {selectedCategory !== 'all' && (
                      <Badge variant="secondary" className="text-xs">
                        {
                          mockCategories.find((c) => c.id === selectedCategory)
                            ?.name
                        }
                        <X
                          className="h-3 w-3 ml-1 cursor-pointer"
                          onClick={() => setSelectedCategory('all')}
                        />
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Categories Filter */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-foreground mb-3">
                  Categories
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedCategory === 'all'
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    All Products ({mockProducts.length})
                  </button>
                  {mockCategories
                    .filter((cat) => !cat.parentId)
                    .map((category) => {
                      const count = mockProducts.filter((p) =>
                        p.categories.some((c) => c.id === category.id)
                      ).length;
                      return (
                        <button
                          key={category.id}
                          onClick={() => setSelectedCategory(category.id)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                            selectedCategory === category.id
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-muted text-muted-foreground'
                          }`}
                        >
                          {category.name} ({count})
                        </button>
                      );
                    })}
                </div>
              </CardContent>
            </Card>

            {/* Price Range Filter */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-foreground mb-3">
                  Price Range
                </h3>
                <div className="space-y-4">
                  <div className="flex gap-2 flex-col">
                    <input
                      type="number"
                      placeholder="Min"
                      value={priceRange.min}
                      onChange={(e) =>
                        setPriceRange({
                          ...priceRange,
                          min: Number(e.target.value),
                        })
                      }
                      className="flex-1 px-3 py-2 bg-muted border border-input rounded-lg text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={priceRange.max}
                      onChange={(e) =>
                        setPriceRange({
                          ...priceRange,
                          max: Number(e.target.value),
                        })
                      }
                      className="flex-1 px-3 py-2 bg-muted border border-input rounded-lg text-sm"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => setPriceRange({ min: 0, max: 10000 })}
                  >
                    Reset
                  </Button>
                </div>
              </CardContent>
            </Card>
          </aside>

          {/* Products Grid */}
          <div className="flex-1">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {filteredProducts.length} products found
              </p>
            </div>

            {filteredProducts.length === 0 ? (
              <Card>
                <EmptyState
                  icon={Package}
                  title="No products found"
                  description="Try adjusting your filters or search query"
                  action={{
                    label: 'Clear Filters',
                    onClick: clearFilters,
                  }}
                />
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((product) => {
                  const minPrice = Math.min(
                    ...product.variants.map((v) => v.price)
                  );
                  const maxPrice = Math.max(
                    ...product.variants.map((v) => v.price)
                  );

                  return (
                    <Card
                      key={product.id}
                      className="hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => navigate.toProduct(product.id)}
                    >
                      <CardContent className="p-0">
                        {/* Image */}
                        <div className="aspect-square bg-muted flex items-center justify-center">
                          <Package className="h-12 w-12 text-muted-foreground" />
                        </div>

                        <div className="p-4">
                          {/* Categories */}
                          <div className="flex flex-wrap gap-1 mb-2">
                            {product.categories.slice(0, 2).map((cat) => (
                              <Badge
                                key={cat.id}
                                variant="secondary"
                                className="text-xs"
                              >
                                {cat.name}
                              </Badge>
                            ))}
                          </div>

                          {/* Title */}
                          <h3 className="font-semibold text-foreground mb-2 line-clamp-2">
                            {product.name}
                          </h3>

                          {/* Description */}
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {product.description}
                          </p>

                          {/* Rating & Sales */}
                          <div className="flex items-center gap-3 mb-3">
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-warning text-warning" />
                              <span className="text-sm font-medium">
                                {product.averageRating}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {product.totalSales} sold
                            </span>
                          </div>

                          {/* Price */}
                          <div className="flex items-center justify-between">
                            <div>
                              {minPrice === maxPrice ? (
                                <p className="text-lg font-bold text-foreground">
                                  ${minPrice.toFixed(2)}
                                </p>
                              ) : (
                                <p className="text-lg font-bold text-foreground">
                                  ${minPrice.toFixed(2)} - $
                                  {maxPrice.toFixed(2)}
                                </p>
                              )}
                            </div>
                            <Badge
                              variant={
                                product.variants.some(
                                  (v) => v.inventory.quantity > 0
                                )
                                  ? 'success'
                                  : 'error'
                              }
                              className="text-xs"
                            >
                              {product.variants.some(
                                (v) => v.inventory.quantity > 0
                              )
                                ? 'In Stock'
                                : 'Out of Stock'}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
