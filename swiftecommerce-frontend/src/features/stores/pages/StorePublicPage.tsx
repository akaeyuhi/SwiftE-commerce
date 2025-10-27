import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/forms/Input';
import { Card, CardContent } from '@/shared/components/ui/Card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  Store as StoreIcon,
  Search,
  Star,
  Package,
  MapPin,
  Heart,
  Share2,
} from 'lucide-react';
import { ProductPublicCard } from '@/features/products/components/ProductPublicCard';
import { mockProducts as products } from '@/shared/mocks/products.mock';
import { mockStores as stores } from '@/shared/mocks/stores.mock';
import { mockCategories as categories } from '@/shared/mocks/categories.mock';

export function StorePublicPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('popular');

  const store = stores[0]!;

  console.log(storeId);

  const filteredProducts = products
    .filter((product) => {
      const matchesSearch = product.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === 'all' ||
        product.categories.some((category) => category.id === selectedCategory);
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price-low': {
          const aMinPrice = Math.min(...a.variants.map((v) => v.price));
          const bMinPrice = Math.min(...b.variants.map((v) => v.price));
          return aMinPrice - bMinPrice;
        }
        case 'price-high': {
          const aMinPrice = Math.min(...a.variants.map((v) => v.price));
          const bMinPrice = Math.min(...b.variants.map((v) => v.price));
          return bMinPrice - aMinPrice;
        }
        case 'rating':
          return b.averageRating - a.averageRating;
        default:
          return b.totalSales - a.totalSales;
      }
    });

  return (
    <div className="min-h-screen bg-background">
      {/* Store Banner */}
      <div className="h-48 bg-gradient-to-br from-primary/20 to-primary/5 relative">
        {store.bannerUrl && (
          <img
            src={store.bannerUrl}
            alt={store.name}
            className="w-full h-full object-cover"
          />
        )}
      </div>

      <div className="container mx-auto px-4">
        {/* Store Info */}
        <div className="relative -mt-16 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Store Logo */}
                <div
                  className="h-32 w-32 rounded-lg bg-card
                border-4 border-background shadow-lg flex items-center justify-center flex-shrink-0"
                >
                  {store.logoUrl ? (
                    <img
                      src={store.logoUrl}
                      alt={store.name}
                      className="h-full w-full object-cover rounded-lg"
                    />
                  ) : (
                    <StoreIcon className="h-16 w-16 text-primary" />
                  )}
                </div>

                {/* Store Details */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h1 className="text-3xl font-bold text-foreground mb-2">
                        {store.name}
                      </h1>
                      <p className="text-muted-foreground mb-2">
                        {store.description}
                      </p>
                      {store.city && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {store.city}, {store.country}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Share2 className="h-4 w-4" />
                      </Button>
                      <Button size="sm">
                        <Heart className="h-4 w-4 mr-2" />
                        Follow
                      </Button>
                    </div>
                  </div>

                  {/* Store Stats */}
                  <div className="flex flex-wrap gap-6">
                    <div className="flex items-center gap-2">
                      <Star className="h-5 w-5 fill-warning text-warning" />
                      <span className="font-semibold text-foreground">
                        {store.averageRating}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        ({store.reviewCount} reviews)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm text-foreground">
                        {store.totalProducts} products
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Heart className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm text-foreground">
                        {store.followersCount} followers
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
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
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="popular">Popular</SelectItem>
                    <SelectItem value="price-low">
                      Price: Low to High
                    </SelectItem>
                    <SelectItem value="price-high">
                      Price: High to Low
                    </SelectItem>
                    <SelectItem value="rating">Highest Rated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
              <Button
                variant={selectedCategory === 'all' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('all')}
              >
                All
              </Button>
              {categories
                .filter((cat) => !cat.parentId) // Only show top-level categories
                .map((category) => (
                  <Button
                    key={category.id}
                    variant={
                      selectedCategory === category.id ? 'primary' : 'outline'
                    }
                    size="sm"
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    {category.name}
                  </Button>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 pb-12">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">No products found</p>
            </div>
          ) : (
            filteredProducts.map((product) => (
              <ProductPublicCard product={product} key={product.id} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
