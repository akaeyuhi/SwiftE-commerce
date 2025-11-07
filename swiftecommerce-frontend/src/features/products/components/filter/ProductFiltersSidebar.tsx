import { Card, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { X } from 'lucide-react';
import { mockCategories } from '@/shared/mocks/categories.mock';

interface ProductFiltersSidebarProps {
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  priceRange: { min: number; max: number };
  setPriceRange: (range: { min: number; max: number }) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
}

export function ProductFiltersSidebar({
  selectedCategory,
  setSelectedCategory,
  priceRange,
  setPriceRange,
  clearFilters,
  hasActiveFilters,
}: ProductFiltersSidebarProps) {
  return (
    <aside className="w-64 space-y-6">
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
                  {mockCategories.find((c) => c.id === selectedCategory)?.name}
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

      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-foreground mb-3">Categories</h3>
          <div className="space-y-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted text-muted-foreground'
              }`}
            >
              All Products
            </button>
            {mockCategories
              .filter((cat) => !cat.parentId)
              .map((category) => {
                const count = mockCategories.filter(
                  (p) => p.parentId === category.id
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

      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-foreground mb-3">Price Range</h3>
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
  );
}
