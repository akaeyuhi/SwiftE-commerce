import { Card, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { X, DollarSign, Package, Users } from 'lucide-react';
import { FormField } from '@/shared/components/forms/FormField.tsx';
import { Input } from '@/shared/components/forms/Input.tsx';

interface StoreFiltersSidebarProps {
  revenueRange: { min: number; max: number };
  setRevenueRange: (range: { min: number; max: number }) => void;
  productRange: { min: number; max: number };
  setProductRange: (range: { min: number; max: number }) => void;
  followerRange: { min: number; max: number };
  setFollowerRange: (range: { min: number; max: number }) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
}

export function StoreFiltersSidebar({
  revenueRange,
  setRevenueRange,
  productRange,
  setProductRange,
  followerRange,
  setFollowerRange,
  clearFilters,
  hasActiveFilters,
}: StoreFiltersSidebarProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <aside className="w-72 space-y-6">
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
                className="text-xs h-auto py-1"
              >
                Clear All
              </Button>
            </div>
            <div className="space-y-2">
              {(revenueRange.min > 0 || revenueRange.max < 1000000) && (
                <Badge variant="secondary" className="text-xs">
                  Revenue: {formatCurrency(revenueRange.min)} -{' '}
                  {formatCurrency(revenueRange.max)}
                  <X
                    className="h-3 w-3 ml-1 cursor-pointer"
                    onClick={() => setRevenueRange({ min: 0, max: 1000000 })}
                  />
                </Badge>
              )}
              {(productRange.min > 0 || productRange.max < 1000) && (
                <Badge variant="secondary" className="text-xs">
                  Products: {productRange.min} - {productRange.max}
                  <X
                    className="h-3 w-3 ml-1 cursor-pointer"
                    onClick={() => setProductRange({ min: 0, max: 1000 })}
                  />
                </Badge>
              )}
              {(followerRange.min > 0 || followerRange.max < 10000) && (
                <Badge variant="secondary" className="text-xs">
                  Followers: {followerRange.min} - {followerRange.max}
                  <X
                    className="h-3 w-3 ml-1 cursor-pointer"
                    onClick={() => setFollowerRange({ min: 0, max: 10000 })}
                  />
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Revenue Range */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-foreground">Revenue Range</h3>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <FormField label="Minimum">
                <Input
                  type="number"
                  placeholder="Min"
                  value={revenueRange.min === 1000000 ? '' : revenueRange.min}
                  onChange={(e) =>
                    setRevenueRange({
                      ...revenueRange,
                      min: Number(e.target.value) || 1000000,
                    })
                  }
                  className="w-full px-3 py-2 bg-muted border border-input rounded-lg text-sm"
                />
              </FormField>
            </div>
            <div className="space-y-2">
              <FormField label="Maximun">
                <Input
                  type="number"
                  placeholder="Max"
                  value={revenueRange.max === 1000000 ? '' : revenueRange.max}
                  onChange={(e) =>
                    setRevenueRange({
                      ...revenueRange,
                      max: Number(e.target.value) || 1000000,
                    })
                  }
                  className="w-full px-3 py-2 bg-muted border border-input rounded-lg text-sm"
                />
              </FormField>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => setRevenueRange({ min: 0, max: 1000000 })}
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Product Count */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Package className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-foreground">Product Count</h3>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <FormField label="Minimum">
                <Input
                  type="number"
                  placeholder="Min"
                  value={revenueRange.min === 1000000 ? '' : revenueRange.min}
                  onChange={(e) =>
                    setRevenueRange({
                      ...revenueRange,
                      min: Number(e.target.value) || 1000000,
                    })
                  }
                  className="w-full px-3 py-2 bg-muted border border-input rounded-lg text-sm"
                />
              </FormField>
            </div>
            <div className="space-y-2">
              <FormField label="Maximum">
                <Input
                  type="number"
                  placeholder="Max"
                  value={revenueRange.max === 1000000 ? '' : revenueRange.max}
                  onChange={(e) =>
                    setRevenueRange({
                      ...revenueRange,
                      max: Number(e.target.value) || 1000000,
                    })
                  }
                  className="w-full px-3 py-2 bg-muted border border-input rounded-lg text-sm"
                />
              </FormField>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => setProductRange({ min: 0, max: 1000 })}
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Follower Count */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-foreground">Followers</h3>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <FormField label="Minimum">
                <Input
                  type="number"
                  placeholder="Min"
                  value={revenueRange.min === 1000000 ? '' : revenueRange.min}
                  onChange={(e) =>
                    setRevenueRange({
                      ...revenueRange,
                      min: Number(e.target.value) || 1000000,
                    })
                  }
                  className="w-full px-3 py-2 bg-muted border border-input rounded-lg text-sm"
                />
              </FormField>
            </div>
            <div className="space-y-2">
              <FormField label="Maximum">
                <Input
                  type="number"
                  placeholder="Max"
                  value={revenueRange.max === 1000000 ? '' : revenueRange.max}
                  onChange={(e) =>
                    setRevenueRange({
                      ...revenueRange,
                      max: Number(e.target.value) || 1000000,
                    })
                  }
                  className="w-full px-3 py-2 bg-muted border border-input rounded-lg text-sm"
                />
              </FormField>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => setFollowerRange({ min: 0, max: 10000 })}
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>
    </aside>
  );
}
