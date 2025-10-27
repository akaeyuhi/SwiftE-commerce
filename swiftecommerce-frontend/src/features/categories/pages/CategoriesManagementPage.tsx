import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/shared/components/ui/Button';
import { Card } from '@/shared/components/ui/Card';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { SearchBar } from '@/shared/components/ui/SearchBar';
import { CategoryCard } from '../components/CategoryCard';
import { Plus, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/shared/components/dialogs/ConfirmDialog.tsx';
import { CategoryFormDialog } from '@/features/categories/components/CategoryFormDialog.tsx';
import { mockCategories } from '@/shared/mocks/categories.mock.ts';

export function CategoriesManagementPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [createDialog, setCreateDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    categoryId: string | null;
  }>({ open: false, categoryId: null });

  console.log(storeId);

  // Mock categories
  const [categories, setCategories] = useState(mockCategories);

  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async () => {
    if (!deleteDialog.categoryId) return;

    try {
      // TODO: API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      setCategories(categories.filter((c) => c.id !== deleteDialog.categoryId));
      toast.success('Category deleted successfully');
      setDeleteDialog({ open: false, categoryId: null });
    } catch (error) {
      toast.error(`Failed to delete category: ${error}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Categories
          </h1>
          <p className="text-muted-foreground">
            Organize your products with categories
          </p>
        </div>
        <Button onClick={() => setCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </div>

      {/* Search */}
      <Card className="p-6">
        <SearchBar
          placeholder="Search categories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </Card>

      {/* Categories Grid */}
      {filteredCategories.length === 0 ? (
        <Card>
          <EmptyState
            icon={Tag}
            title="No categories found"
            description={
              searchQuery
                ? 'Try adjusting your search'
                : 'Create your first category to organize products'
            }
            action={
              !searchQuery
                ? {
                    label: 'Add Category',
                    onClick: () => setCreateDialog(true),
                  }
                : undefined
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCategories.map((category) => (
            <CategoryCard
              key={category.id}
              {...(category as any)}
              parentCategory={category.parentName}
              onEdit={() => {
                setEditingCategory(category);
                setCreateDialog(true);
              }}
              onDelete={(id) => setDeleteDialog({ open: true, categoryId: id })}
              onView={(id) => console.log('View category:', id)}
            />
          ))}
        </div>
      )}

      <CategoryFormDialog
        open={createDialog}
        onOpenChange={setCreateDialog}
        category={editingCategory}
        categories={categories}
        onSuccess={() => {
          setCreateDialog(false);
          setEditingCategory(null);
          toast.success(
            editingCategory ? 'Category updated' : 'Category created'
          );
        }}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open: boolean) =>
          setDeleteDialog({ open, categoryId: null })
        }
        title="Delete category?"
        description="This will remove the category from all products. This action cannot be undone."
        confirmText="Delete"
        variant="danger"
        onConfirm={handleDelete}
      />
    </div>
  );
}
