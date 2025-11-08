import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/forms/Input';
import { FormField } from '@/shared/components/forms/FormField';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/dialogs/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  categorySchema,
  CategoryFormData,
} from '@/lib/validations/product.schemas';
import { useEffect, useMemo } from 'react';
import { Textarea } from '@/shared/components/forms/Textarea';
import { useCategoryMutations } from '../hooks/useCategories';
import { CategoryDto } from '../types/categories.types';

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: CategoryDto | null;
  categories: CategoryDto[];
  storeId: string;
  onSuccess: () => void;
}

export function CategoryFormDialog({
  open,
  onOpenChange,
  category,
  categories,
  storeId,
  onSuccess,
}: CategoryFormDialogProps) {
  const { createCategory, updateCategory } = useCategoryMutations(storeId);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
  });

  useEffect(() => {
    if (open) {
      reset(
        category
          ? {
              name: category.name,
              description: category.description || '',
              parentId: category.parentId || undefined,
            }
          : {
              name: '',
              description: '',
              parentId: undefined,
            }
      );
    }
  }, [category, open, reset]);

  const onSubmit = (data: CategoryFormData) => {
    if (category) {
      updateCategory.mutate(
        { id: category.id, data },
        {
          onSuccess: () => {
            reset();
            onSuccess();
          },
        }
      );
    } else {
      createCategory.mutate(data, {
        onSuccess: () => {
          reset();
          onSuccess();
        },
      });
    }
  };

  const parentOptions = useMemo(
    () =>
      // TODO: Improve this to filter out children and grandchildren
      categories.filter((c) => c.id !== category?.id),
    [categories, category]
  );

  const isLoading = createCategory.isPending || updateCategory.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {category ? 'Edit Category' : 'Create Category'}
          </DialogTitle>
          <DialogDescription>
            {category
              ? 'Update category information'
              : 'Add a new category to organize your products'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Category Name" error={errors.name} required>
            <Input
              {...register('name')}
              placeholder="e.g., Electronics"
              error={!!errors.name}
              disabled={isLoading}
            />
          </FormField>

          <FormField label="Description" error={errors.description}>
            <Textarea
              {...register('description')}
              placeholder="Brief description of this category"
              rows={3}
              disabled={isLoading}
            />
          </FormField>

          <FormField label="Parent Category" error={errors.parentId}>
            <Select
              onValueChange={(value) =>
                setValue('parentId', value === 'none' ? undefined : value)
              }
              defaultValue={category?.parentId || 'none'}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select parent category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (Root Category)</SelectItem>
                {parentOptions.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isLoading}>
              {category ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
