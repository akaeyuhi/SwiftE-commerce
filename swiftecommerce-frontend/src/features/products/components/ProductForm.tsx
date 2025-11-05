import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/forms/Input';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/dialogs/dialog.tsx';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/components/dialogs/alert-dialog.tsx';
import {
  productSchema,
  ProductFormData,
} from '@/lib/validations/product.schemas';
import { useState } from 'react';
import {
  Plus,
  Trash2,
  Tag,
  Layers,
  Package,
  AlertTriangle,
  X,
} from 'lucide-react';
import { Textarea } from '@/shared/components/forms/Textarea.tsx';
import { MultiImageUpload } from '@/shared/components/forms/MultiImageUpload.tsx';

interface ProductFormProps {
  defaultValues?: Partial<ProductFormData>;
  onSubmit: (data: ProductFormData, newImages: File[]) => Promise<void>;
  isLoading: boolean;
  isEdit?: boolean;
  existingImageUrls?: string[];
  onRemoveExistingImage?: (index: number) => void;
}

export function ProductForm({
  defaultValues,
  onSubmit,
  isLoading,
  isEdit = false,
  existingImageUrls = [],
  onRemoveExistingImage,
}: ProductFormProps) {
  const [newImages, setNewImages] = useState<File[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    defaultValues?.categoryIds || []
  );
  const [attributeKey, setAttributeKey] = useState('');
  const [attributeValue, setAttributeValue] = useState('');
  const [editingVariantIndex, setEditingVariantIndex] = useState<number | null>(
    null
  );

  // Mock categories
  const availableCategories = [
    { id: '1', name: 'Electronics' },
    { id: '2', name: 'Audio' },
    { id: '3', name: 'Wearables' },
    { id: '4', name: 'Gaming' },
    { id: '5', name: 'Accessories' },
    { id: '6', name: 'Office' },
  ];

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isDirty },
    setValue,
    watch,
  } = useForm<ProductFormData>({
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

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'variants',
  });

  const variants = watch('variants');

  const toggleCategory = (categoryId: string) => {
    const newCategories = selectedCategories.includes(categoryId)
      ? selectedCategories.filter((id) => id !== categoryId)
      : [...selectedCategories, categoryId];

    setSelectedCategories(newCategories);
    setValue('categoryIds', newCategories, { shouldDirty: true });
  };

  const addAttributeToVariant = (variantIndex: number) => {
    if (!attributeKey || !attributeValue) return;

    const currentAttributes = variants[variantIndex]?.attributes || {};
    setValue(
      `variants.${variantIndex}.attributes`,
      {
        ...currentAttributes,
        [attributeKey]: attributeValue,
      },
      { shouldDirty: true }
    );

    setAttributeKey('');
    setAttributeValue('');
    setEditingVariantIndex(null);
  };

  const removeAttributeFromVariant = (variantIndex: number, key: string) => {
    const currentAttributes = variants[variantIndex]?.attributes || {};
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { [key]: removed, ...rest } = currentAttributes;
    setValue(`variants.${variantIndex}.attributes`, rest, {
      shouldDirty: true,
    });
  };

  const deleteVariant = (variantIndex: number) => {
    if (fields.length === 1) {
      return;
    }
    remove(variantIndex);
  };

  const getTotalStock = () =>
    variants.reduce((sum, v) => sum + (v.quantity || 0), 0);

  return (
    <form
      onSubmit={handleSubmit((data) => onSubmit(data, newImages))}
      className="space-y-6"
    >
      {/* Out of Stock Warning */}
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

      {/* Basic Information */}
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

      {/* Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
          <CardDescription>Select categories for this product</CardDescription>
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

      {/* Product Variants */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Product Variants ({fields.length})</CardTitle>
              <CardDescription>
                Add variants with different SKUs, prices, and inventory
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                append({
                  sku: '',
                  price: 0,
                  quantity: 0,
                  attributes: {},
                })
              }
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Variant
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Variants Summary */}
          {isEdit && (
            <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground">Total Variants</p>
                <p className="text-xl font-bold text-foreground">
                  {fields.length}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Stock</p>
                <p className="text-xl font-bold text-foreground">
                  {getTotalStock()}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Price Range</p>
                <p className="text-xl font-bold text-foreground">
                  ${Math.min(...variants.map((v) => v.price || 0)).toFixed(2)} -
                  ${Math.max(...variants.map((v) => v.price || 0)).toFixed(2)}
                </p>
              </div>
            </div>
          )}

          {fields.map((field, index) => (
            <div
              key={field.id}
              className="border border-border rounded-lg p-4 space-y-4"
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  Variant {index + 1}
                </h4>
                {fields.length > 1 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button type="button" variant="outline" size="sm">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete variant?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete this variant. This action
                          cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteVariant(index)}
                          className="bg-error text-error-foreground hover:bg-error/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  label="SKU"
                  error={errors.variants?.[index]?.sku}
                  required
                >
                  <Input
                    {...register(`variants.${index}.sku`)}
                    placeholder="e.g., WH-BLK-001"
                    error={!!errors.variants?.[index]?.sku}
                  />
                </FormField>

                <FormField
                  label="Price"
                  error={errors.variants?.[index]?.price}
                  required
                >
                  <div className="relative">
                    <span
                      className="absolute left-3 top-1/2
                    -translate-y-1/2 text-muted-foreground"
                    >
                      $
                    </span>
                    <Input
                      {...register(`variants.${index}.price`, {
                        valueAsNumber: true,
                      })}
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="pl-7"
                      error={!!errors.variants?.[index]?.price}
                    />
                  </div>
                </FormField>

                <FormField
                  label="Quantity"
                  error={errors.variants?.[index]?.quantity}
                  required
                >
                  <Input
                    {...register(`variants.${index}.quantity`, {
                      valueAsNumber: true,
                    })}
                    type="number"
                    placeholder="0"
                    error={!!errors.variants?.[index]?.quantity}
                  />
                </FormField>
              </div>

              {/* Variant Attributes */}
              <div className="border-t border-border pt-4 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-foreground">
                    Attributes (e.g., Color, Size)
                  </p>
                  <Dialog
                    open={editingVariantIndex === index}
                    onOpenChange={(open) =>
                      setEditingVariantIndex(open ? index : null)
                    }
                  >
                    <DialogTrigger asChild>
                      <Button type="button" variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Attribute
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Attribute</DialogTitle>
                        <DialogDescription>
                          Add a custom attribute to this variant
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <FormField label="Attribute Name">
                          <Input
                            value={attributeKey}
                            onChange={(e) => setAttributeKey(e.target.value)}
                            placeholder="e.g., Color, Size, Material"
                          />
                        </FormField>
                        <FormField label="Value">
                          <Input
                            value={attributeValue}
                            onChange={(e) => setAttributeValue(e.target.value)}
                            placeholder="e.g., Black, Large, Cotton"
                          />
                        </FormField>
                      </div>
                      <DialogFooter>
                        <Button
                          type="button"
                          onClick={() => addAttributeToVariant(index)}
                        >
                          Add
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                {variants[index]?.attributes &&
                  Object.keys(variants[index].attributes!).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(variants[index].attributes!).map(
                        ([key, value]) => (
                          <Badge key={key} variant="secondary">
                            {key}: {String(value)}
                            <button
                              type="button"
                              onClick={() =>
                                removeAttributeFromVariant(index, key)
                              }
                              className="ml-2"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        )
                      )}
                    </div>
                  )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Product Images */}
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

      {/* Actions */}
      <div className="flex gap-4">
        <Button
          type="submit"
          size="lg"
          className="flex-1"
          loading={isLoading}
          disabled={isEdit && !isDirty}
        >
          <Package className="h-4 w-4 mr-2" />
          {isEdit ? 'Save Changes' : 'Create Product'}
        </Button>
      </div>
    </form>
  );
}
