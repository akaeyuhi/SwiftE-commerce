import { Card, CardContent } from '@/shared/components/ui/Card.tsx';
import { Search } from 'lucide-react';
import { Input } from '@/shared/components/forms/Input.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select.tsx';

interface StoreFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortBy: string;
  setSortBy: (sortBy: string) => void;
}

export const StoreFilters: React.FC<StoreFiltersProps> = ({
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
}) => (
  <Card className="mb-8">
    <CardContent className="p-6">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search
            className="absolute left-3 top-1/2
                -translate-y-1/2 h-4 w-4 text-muted-foreground"
          />
          <Input
            placeholder="Search stores..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="popular">Most Popular</SelectItem>
            <SelectItem value="rating">Highest Rated</SelectItem>
            <SelectItem value="sales">Most Sales</SelectItem>
            <SelectItem value="products">Most Products</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </CardContent>
  </Card>
);
