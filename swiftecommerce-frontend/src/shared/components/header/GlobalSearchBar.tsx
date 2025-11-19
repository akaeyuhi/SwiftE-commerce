import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Store, Package } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Input } from '@/shared/components/forms/Input';
import { Button } from '@/shared/components/ui/Button';
import { ROUTES } from '@/app/routes/routes';

export function GlobalSearchBar() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState('products');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    const encodedQuery = query.trim() ? encodeURIComponent(query.trim()) : '';

    if (searchType === 'products') {
      navigate(
        encodedQuery
          ? `${ROUTES.PRODUCTS}?search=${encodedQuery}`
          : ROUTES.PRODUCTS
      );
    } else {
      navigate(
        encodedQuery
          ? `${ROUTES.STORE_SEARCH}?q=${encodedQuery}`
          : ROUTES.STORE_SEARCH
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(e as any);
    }
  };

  return (
    <form
      onSubmit={handleSearch}
      className="relative flex w-full items-center gap-0"
    >
      {/* Search Type Selector */}
      <Select value={searchType} onValueChange={setSearchType}>
        <SelectTrigger className="w-32 rounded-r-none border-r-0 focus:z-10">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="products">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Products
            </div>
          </SelectItem>
          <SelectItem value="stores">
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              Stores
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      {/* Search Input */}
      <div className="relative flex-1">
        <Search
          className="absolute left-3 top-1/2 h-5 w-5
        -translate-y-1/2 text-muted-foreground pointer-events-none"
        />
        <Input
          type="text"
          placeholder={`Search ${searchType}...`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full rounded-none border-l-0 pl-10 pr-4 focus:z-10"
        />
      </div>

      {/* Search Button */}
      <Button
        type="submit"
        className="rounded-l-none border border-l-0 focus:z-10 "
        variant="outline"
        aria-label="Search"
      >
        <Search className="h-4 w-4 mr-2" />
        Search
      </Button>
    </form>
  );
}
