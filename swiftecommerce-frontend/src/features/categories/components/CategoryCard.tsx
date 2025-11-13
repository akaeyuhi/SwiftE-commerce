import { Button } from '@/shared/components/ui/Button';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { Edit, Trash2, Tag, ChevronRight } from 'lucide-react';

interface CategoryCardProps {
  id: string;
  name: string;
  description?: string;
  productCount: number;
  parentCategory?: string;
  childrenCount: number;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onView: (id: string) => void;
}

export function CategoryCard({
  id,
  name,
  description,
  productCount,
  parentCategory,
  childrenCount,
  onEdit,
  onDelete,
  onView,
}: CategoryCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Tag className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{name}</h3>
              {parentCategory && (
                <p className="text-xs text-muted-foreground">
                  Parent: {parentCategory}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onEdit(id)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => onDelete(id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {description}
          </p>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="flex gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Products</p>
              <p className="text-sm font-semibold text-foreground">
                {productCount}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Subcategories</p>
              <p className="text-sm font-semibold text-foreground">
                {childrenCount}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onView(id)}>
            View
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
