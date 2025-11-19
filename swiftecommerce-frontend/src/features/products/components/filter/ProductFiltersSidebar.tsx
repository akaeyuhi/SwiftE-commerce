import { Card, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { Checkbox } from '@/shared/components/ui/Checkbox';
import {
  X,
  Star,
  Store as StoreIcon,
  ChevronDown,
  ChevronRight,
  Search,
  DollarSign,
} from 'lucide-react';
import { useMemo, useState } from 'react';

interface ProductFiltersSidebarProps {
  products: any[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategories: string[];
  setSelectedCategories: (categories: string[]) => void;
  priceRange: { min: number; max: number };
  setPriceRange: (range: { min: number; max: number }) => void;
  ratingRange: { min: number; max: number };
  setRatingRange: (range: { min: number; max: number }) => void;
  inStockOnly: boolean;
  setInStockOnly: (value: boolean) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
}

export function ProductFiltersSidebar({
  products,
  searchQuery,
  setSearchQuery,
  selectedCategories,
  setSelectedCategories,
  priceRange,
  setPriceRange,
  ratingRange,
  setRatingRange,
  inStockOnly,
  setInStockOnly,
  clearFilters,
  hasActiveFilters,
}: ProductFiltersSidebarProps) {
  const [expandedStores, setExpandedStores] = useState<Set<string>>(new Set());

  const categoriesByStore = useMemo(() => {
    const storeMap = new Map<
      string,
      {
        storeName: string;
        categories: Map<string, { id: string; name: string; count: number }>;
      }
    >();

    products.forEach((product) => {
      const storeId = product.storeId || product.store?.id;
      const storeName = product.store?.name || 'Unknown Store';

      if (!storeMap.has(storeId)) {
        storeMap.set(storeId, {
          storeName,
          categories: new Map(),
        });
        setExpandedStores((prev) => new Set(prev).add(storeId));
      }

      const store = storeMap.get(storeId)!;

      product.categories?.forEach((category: any) => {
        const catId = category.id;
        const catName = category.name;

        if (store.categories.has(catId)) {
          const existing = store.categories.get(catId)!;
          existing.count += 1;
        } else {
          store.categories.set(catId, {
            id: catId,
            name: catName,
            count: 1,
          });
        }
      });
    });

    return Array.from(storeMap.entries())
      .map(([storeId, data]) => ({
        storeId,
        storeName: data.storeName,
        categories: Array.from(data.categories.values()).sort((a, b) =>
          a.name.localeCompare(b.name)
        ),
      }))
      .filter((store) => store.categories.length > 0)
      .sort((a, b) => a.storeName.localeCompare(b.storeName));
  }, [products]);

  const toggleStore = (storeId: string) => {
    setExpandedStores((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(storeId)) {
        newSet.delete(storeId);
      } else {
        newSet.add(storeId);
      }
      return newSet;
    });
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(
      selectedCategories.includes(categoryId)
        ? selectedCategories.filter((id) => id !== categoryId)
        : [...selectedCategories, categoryId]
    );
  };

  const selectedCategoryNames = useMemo(() => {
    const names: string[] = [];
    categoriesByStore.forEach((store) => {
      store.categories.forEach((cat) => {
        if (selectedCategories.includes(cat.id)) {
          names.push(cat.name);
        }
      });
    });
    return names;
  }, [selectedCategories, categoriesByStore]);

  const hasPriceFilter = priceRange.min > 0 || priceRange.max < 10000;

  const hasRatingFilter = ratingRange.min > 0;

  const formatPrice = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <aside className="w-80 space-y-6">
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
                className="text-xs h-auto py-1"
              >
                Clear All
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {searchQuery && (
                <Badge variant="default" className="text-xs gap-1">
                  <Search className="h-3 w-3" />
                  <span className="max-w-[150px] truncate">
                    &#34;{searchQuery}&#34;
                  </span>
                  <X
                    className="h-3 w-3 ml-1 cursor-pointer hover:text-destructive"
                    onClick={() => setSearchQuery('')}
                  />
                </Badge>
              )}

              {hasPriceFilter && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <DollarSign className="h-3 w-3" />
                  {priceRange.min > 0 && priceRange.max < 10000
                    ? `${formatPrice(priceRange.min)} - ${formatPrice(priceRange.max)}`
                    : priceRange.min > 0
                      ? `Min ${formatPrice(priceRange.min)}`
                      : `Max ${formatPrice(priceRange.max)}`}
                  <X
                    className="h-3 w-3 ml-1 cursor-pointer hover:text-destructive"
                    onClick={() => setPriceRange({ min: 0, max: 10000 })}
                  />
                </Badge>
              )}

              {/* ✅ Rating Badge */}
              {hasRatingFilter && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <div className="flex items-center">
                    {Array.from({ length: ratingRange.min }).map((_, i) => (
                      <Star
                        key={i}
                        className="h-3 w-3 fill-warning text-warning"
                      />
                    ))}
                  </div>
                  <span>& Up</span>
                  <X
                    className="h-3 w-3 ml-1 cursor-pointer hover:text-destructive"
                    onClick={() => setRatingRange({ min: 0, max: 5 })}
                  />
                </Badge>
              )}

              {/* Category Badges */}
              {selectedCategoryNames.map((name: string, index: number) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="text-xs gap-1"
                >
                  {name}
                  <X
                    className="h-3 w-3 ml-1 cursor-pointer hover:text-destructive"
                    onClick={() => toggleCategory(selectedCategories[index]!)}
                  />
                </Badge>
              ))}

              {/* Stock Badge */}
              {inStockOnly && (
                <Badge variant="secondary" className="text-xs gap-1">
                  In Stock Only
                  <X
                    className="h-3 w-3 ml-1 cursor-pointer hover:text-destructive"
                    onClick={() => setInStockOnly(false)}
                  />
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Availability */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-foreground mb-3">Availability</h3>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="in-stock"
              checked={inStockOnly}
              onCheckedChange={(checked: any) => setInStockOnly(!!checked)}
            />
            <label
              htmlFor="in-stock"
              className="text-sm font-medium leading-none cursor-pointer"
            >
              In Stock Only
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Categories */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground">Categories</h3>
            {categoriesByStore.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (expandedStores.size === categoriesByStore.length) {
                    setExpandedStores(new Set());
                  } else {
                    setExpandedStores(
                      new Set(categoriesByStore.map((s) => s.storeId))
                    );
                  }
                }}
                className="text-xs h-auto py-1"
              >
                {expandedStores.size === categoriesByStore.length
                  ? 'Collapse All'
                  : 'Expand All'}
              </Button>
            )}
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {categoriesByStore.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No categories available
              </p>
            ) : (
              categoriesByStore.map((store) => (
                <div key={store.storeId} className="space-y-2">
                  <button
                    onClick={() => toggleStore(store.storeId)}
                    className="flex items-center justify-between w-full pb-2 border-b
                    border-border hover:bg-muted/50 rounded-t px-2 py-1 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <StoreIcon className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="text-xs font-semibold text-foreground truncate">
                        {store.storeName}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {store.categories.length}
                      </Badge>
                    </div>
                    {expandedStores.has(store.storeId) ? (
                      <ChevronDown className="h-4 w-4 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 flex-shrink-0" />
                    )}
                  </button>

                  {expandedStores.has(store.storeId) && (
                    <div className="space-y-2 pl-2 animate-in slide-in-from-top-2 duration-200">
                      {store.categories.map((category) => (
                        <div
                          key={category.id}
                          className="flex items-center justify-between space-x-2"
                        >
                          <div className="flex items-center space-x-2 flex-1 min-w-0">
                            <Checkbox
                              id={`cat-${category.id}`}
                              checked={selectedCategories.includes(category.id)}
                              onCheckedChange={() =>
                                toggleCategory(category.id)
                              }
                            />
                            <label
                              htmlFor={`cat-${category.id}`}
                              className="text-sm leading-none cursor-pointer truncate"
                            >
                              {category.name}
                            </label>
                          </div>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            ({category.count})
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Price Range */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-foreground mb-3">Price Range</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">
                Minimum ($)
              </label>
              <input
                type="number"
                placeholder="0"
                value={priceRange.min || ''}
                onChange={(e) =>
                  setPriceRange({
                    ...priceRange,
                    min: Number(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 bg-muted border border-input rounded-lg text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">
                Maximum ($)
              </label>
              <input
                type="number"
                placeholder="10000"
                value={priceRange.max === 10000 ? '' : priceRange.max}
                onChange={(e) =>
                  setPriceRange({
                    ...priceRange,
                    max: Number(e.target.value) || 10000,
                  })
                }
                className="w-full px-3 py-2 bg-muted border border-input rounded-lg text-sm"
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

      {/* Rating Filter */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-foreground mb-3">Minimum Rating</h3>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((rating) => (
              <button
                key={rating}
                onClick={() => setRatingRange({ min: rating, max: 5 })}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                  ratingRange.min === rating
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted text-foreground'
                }`}
              >
                <div className="flex items-center">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < rating
                          ? 'fill-warning text-warning'
                          : 'text-muted-foreground'
                      }`}
                    />
                  ))}
                </div>
                <span>& Up</span>
              </button>
            ))}
          </div>
          {ratingRange.min > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="w-full mt-3"
              onClick={() => setRatingRange({ min: 0, max: 5 })}
            >
              Clear Rating
            </Button>
          )}
        </CardContent>
      </Card>
    </aside>
  );
}
