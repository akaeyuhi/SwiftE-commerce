import { useState } from 'react';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { Store as StoreIcon } from 'lucide-react';
import { StoreFilters } from '../components/StoreFilters';
import { StoresGrid } from '@/features/stores/components/StoresGrid.tsx';
import { mockStores as stores } from '@/shared/mocks/stores.mock.ts';

export interface Store {
  id: string;
  name: string;
  description: string;
  logoUrl?: string;
  bannerUrl?: string;
  isActive: boolean;
  totalProducts: number;
  totalSales: number;
  averageRating?: number;
  followersCount: number;
  city?: string;
  country?: string;
}

export function StoresPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('popular');

  const filteredStores = stores
    .filter(
      (store) =>
        store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        store.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'popular':
          return b.followersCount - a.followersCount;
        case 'rating':
          return (b.averageRating || 0) - (a.averageRating || 0);
        case 'sales':
          return b.totalSales - a.totalSales;
        case 'products':
          return b.totalProducts - a.totalProducts;
        default:
          return 0;
      }
    });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Discover Stores
          </h1>
          <p className="text-lg text-muted-foreground">
            Browse through {stores.length} amazing stores
          </p>
        </div>

        <StoreFilters
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          setSortBy={setSortBy}
          sortBy={sortBy}
        />

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-3xl font-bold text-primary mb-1">
                {stores.length}
              </p>
              <p className="text-sm text-muted-foreground">Active Stores</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-3xl font-bold text-success mb-1">
                {stores.reduce((sum, s) => sum + s.totalProducts, 0)}
              </p>
              <p className="text-sm text-muted-foreground">Total Products</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-3xl font-bold text-info mb-1">
                {stores.reduce((sum, s) => sum + s.totalSales, 0)}
              </p>
              <p className="text-sm text-muted-foreground">Total Sales</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-3xl font-bold text-warning mb-1">
                {(
                  stores.reduce((sum, s) => sum + (s.averageRating || 0), 0) /
                  stores.length
                ).toFixed(1)}
              </p>
              <p className="text-sm text-muted-foreground">Avg Rating</p>
            </CardContent>
          </Card>
        </div>

        {filteredStores.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <StoreIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No stores found
              </h3>
              <p className="text-muted-foreground">
                Try adjusting your search query
              </p>
            </CardContent>
          </Card>
        ) : (
          <StoresGrid stores={filteredStores as any} />
        )}
      </div>
    </div>
  );
}
