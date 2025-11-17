import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/shared/components/ui/Button';
import { FormField } from '@/shared/components/forms/FormField';
import { Badge } from '@/shared/components/ui/Badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/Card';
import {
  productSchema,
  ProductFormData,
} from '@/lib/validations/product.schemas';
import { useState } from 'react';
import { Tag, Package, AlertTriangle } from 'lucide-react';
import { Textarea } from '@/shared/components/forms/Textarea.tsx';
import { MultiImageUpload } from '@/shared/components/forms/MultiImageUpload.tsx';
import { CategoryDto } from '@/features/categories/types/categories.types.ts';
import { ProductVariantsFormSection } from './ProductVariantsFormSection';
import { Input } from '@/shared/components/forms/Input';

interface ProductFormProps {
  defaultValues?: Partial<ProductFormData>;
  availableCategories: CategoryDto[];
  onSubmit: (data: ProductFormData, newImages: File[]) => Promise<void>;
  isLoading: boolean;
  isEdit?: boolean;
  existingImageUrls?: string[];
  onRemoveExistingImage?: (index: number) => void;
  onRemoveVariant?: (variantId: string) => void;
}

export function ProductForm({
  defaultValues,
  onSubmit,
  isLoading,
  availableCategories,
  isEdit = false,
  existingImageUrls = [],
  onRemoveExistingImage,
  onRemoveVariant,
}: ProductFormProps) {
  const [newImages, setNewImages] = useState<File[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    defaultValues?.categoryIds || []
  );

  const methods = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: defaultValues || {
      name: '',
      description: '',
      categoryIds: [],
      variants: [
        {
          sku: '',
          price: 0,
          quantity: 0,
          attributes: {},
        },
      ],
    },
  });

  const {
    register,
    formState: { errors, isDirty },
    setValue,
    watch,
  } = methods;

  const toggleCategory = (categoryId: string) => {
    const newCategories = selectedCategories.includes(categoryId)
      ? selectedCategories.filter((id) => id !== categoryId)
      : [...selectedCategories, categoryId];

    setSelectedCategories(newCategories);
    setValue('categoryIds', newCategories, { shouldDirty: true });
  };

  const variants = watch('variants');
  const getTotalStock = () =>
    variants.reduce((sum, v) => sum + (v.quantity || 0), 0);

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={methods.handleSubmit((data) => onSubmit(data, newImages))}
        className="space-y-6"
      >
        {isEdit && getTotalStock() === 0 && (
          <Card className="border-warning bg-warning/5">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0" />
              <div>
                <p className="font-semibold text-warning">Out of Stock</p>
                <p className="text-sm text-muted-foreground">
                  This product has no stock across all variants
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Product name and description</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="Product Name" error={errors.name} required>
              <Input
                {...register('name')}
                placeholder="e.g., Wireless Headphones"
                error={!!errors.name}
              />
            </FormField>

            <FormField label="Description" error={errors.description} required>
              <Textarea
                {...register('description')}
                placeholder="Describe your product in detail..."
                rows={5}
                error={!!errors.description}
              />
            </FormField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Categories</CardTitle>
            <CardDescription>
              Select categories for this product
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {availableCategories.map((category) => (
                <Badge
                  key={category.id}
                  variant={
                    selectedCategories.includes(category.id)
                      ? 'default'
                      : 'outline'
                  }
                  className="cursor-pointer"
                  onClick={() => toggleCategory(category.id)}
                >
                  <Tag className="h-3 w-3 mr-1" />
                  {category.name}
                </Badge>
              ))}
            </div>
            {errors.categoryIds && (
              <p className="text-xs text-error mt-2">
                {errors.categoryIds.message}
              </p>
            )}
          </CardContent>
        </Card>

        <ProductVariantsFormSection
          isEdit={isEdit}
          onRemoveVariant={onRemoveVariant}
        />

        <Card>
          <CardHeader>
            <CardTitle>Product Images</CardTitle>
            <CardDescription>
              Upload photos of your product (up to 10 images)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MultiImageUpload
              label="Product Images"
              onFilesSelect={setNewImages}
              maxSizeMb={5}
              maxFiles={10}
              existingImageUrls={existingImageUrls}
              onRemoveExistingImage={onRemoveExistingImage}
            />
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button
            type="submit"
            size="lg"
            className="flex-1"
            loading={isLoading}
            onClick={() => onSubmit(methods.getValues(), newImages)}
            disabled={isEdit && !isDirty}
          >
            <Package className="h-4 w-4 mr-2" />
            {isEdit ? 'Save Changes' : 'Create Product'}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
