import { SearchBar } from '@/shared/components/ui/SearchBar';
import { Button } from '@/shared/components/ui/Button';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { CategoryDto } from '@/features/categories/types/categories.types.ts';

interface ProductFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  categories: CategoryDto[];
  selectedCategory: CategoryDto | 'all';
  onCategoryChange: (category: CategoryDto) => void;
}

export function ProductFilters({
  searchQuery,
  onSearchChange,
  categories,
  selectedCategory,
  onCategoryChange,
}: ProductFiltersProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <SearchBar
            placeholder="Search by name or SKU..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <div className="flex gap-2 overflow-x-auto">
            {categories.length ? (
              categories.map((category) => (
                <Button
                  key={category.id}
                  variant={
                    selectedCategory === category.name ? 'primary' : 'outline'
                  }
                  size="sm"
                  onClick={() => onCategoryChange(category)}
                >
                  {category.name}
                </Button>
              ))
            ) : (
              <></>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
