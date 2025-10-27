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
} from '@/shared/components/dialogs/dialog.tsx';
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
import { useState } from 'react';
import { Textarea } from '@/shared/components/forms/Textarea.tsx';

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: any; // Existing category for editing
  categories: any[]; // All categories for parent selection
  onSuccess: () => void;
}

export function CategoryFormDialog({
  open,
  onOpenChange,
  category,
  categories,
  onSuccess,
}: CategoryFormDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: category
      ? {
          name: category.name,
          description: category.description || '',
          parentId: category.parentId || undefined,
        }
      : {
          name: '',
          description: '',
          parentId: undefined,
        },
  });

  const onSubmit = async (data: CategoryFormData) => {
    setIsLoading(true);
    try {
      // TODO: API call
      // if (category) {
      //   await categoryService.updateCategory(category.id, data)
      // } else {
      //   await categoryService.createCategory(data)
      // }

      await new Promise((resolve) => setTimeout(resolve, 500));

      console.log('Category data:', data);
      reset();
      onSuccess();
    } catch (error) {
      console.error('Failed to save category:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter out current category and its children from parent options
  const parentOptions = categories.filter(
    (c) => c.id !== category?.id && c.parentId !== category?.id && !c.parentId // Only show root categories as parents
  );

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
            />
          </FormField>

          <FormField label="Description" error={errors.description}>
            <Textarea
              {...register('description')}
              placeholder="Brief description of this category"
              rows={3}
            />
          </FormField>

          <FormField label="Parent Category" error={errors.parentId}>
            <Select
              onValueChange={(value) =>
                setValue('parentId', value === 'none' ? undefined : value)
              }
              defaultValue={category?.parentId || 'none'}
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
