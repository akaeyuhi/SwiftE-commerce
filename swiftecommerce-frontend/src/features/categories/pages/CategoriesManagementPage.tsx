import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/shared/components/ui/Button';
import { Card } from '@/shared/components/ui/Card';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { SearchBar } from '@/shared/components/ui/SearchBar';
import { CategoryCard } from '../components/CategoryCard';
import { Plus, Tag } from 'lucide-react';
import { ConfirmDialog } from '@/shared/components/dialogs/ConfirmDialog';
import { CategoryFormDialog } from '@/features/categories/components/CategoryFormDialog';
import { useCategories, useCategoryMutations } from '../hooks/useCategories';
import { QueryLoader } from '@/shared/components/loaders/QueryLoader';
import { CategoryDto } from '../types/categories.types';

export function CategoriesManagementPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryDto | null>(
    null
  );
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    categoryId: string | null;
  }>({ open: false, categoryId: null });

  const { data, isLoading, error, isFetching } = useCategories(storeId!);
  const { deleteCategory } = useCategoryMutations(storeId!);

  const categories = data?.data;

  const filteredCategories = useMemo(
    () =>
      categories?.filter((category) =>
        category.name.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [categories, searchQuery]
  );

  const handleDelete = () => {
    if (!deleteDialog.categoryId) return;
    deleteCategory.mutate(deleteDialog.categoryId, {
      onSuccess: () => {
        setDeleteDialog({ open: false, categoryId: null });
      },
    });
  };

  const handleEdit = (category: CategoryDto) => {
    setEditingCategory(category);
    setIsFormOpen(true);
  };

  const handleCreate = () => {
    setEditingCategory(null);
    setIsFormOpen(true);
  };

  //TODO category pagination

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Categories
          </h1>
          <p className="text-muted-foreground">
            Organize your products with categories
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </div>

      <Card className="p-6">
        <SearchBar
          placeholder="Search categories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </Card>

      <QueryLoader isLoading={isLoading} isFetching={isFetching} error={error}>
        {filteredCategories?.length === 0 ? (
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
                      onClick: handleCreate,
                    }
                  : undefined
              }
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCategories?.map((category) => (
              <CategoryCard
                key={category.id}
                id={category.id}
                name={category.name}
                description={category.description}
                productCount={0} // TODO: This should come from the API
                childrenCount={category.children?.length || 0}
                onEdit={() => handleEdit(category)}
                onDelete={(id) =>
                  setDeleteDialog({ open: true, categoryId: id })
                }
                onView={(id) => console.log('View category:', id)}
              />
            ))}
          </div>
        )}
      </QueryLoader>

      <CategoryFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        category={editingCategory}
        categories={categories!}
        storeId={storeId!}
        onSuccess={() => {
          setIsFormOpen(false);
          setEditingCategory(null);
        }}
      />

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, categoryId: null })}
        title="Delete category?"
        description="This will remove the category from all products. This action cannot be undone."
        confirmText="Delete"
        variant="danger"
        onConfirm={handleDelete}
        loading={deleteCategory.isPending}
      />
    </div>
  );
}
