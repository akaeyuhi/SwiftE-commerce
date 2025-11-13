import { useFieldArray, useFormContext } from 'react-hook-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Layers, Plus, Trash2, X } from 'lucide-react';
import { ProductFormData } from '@/lib/validations/product.schemas.ts';
import { FormField } from '@/shared/components/forms/FormField.tsx';
import { Input } from '@/shared/components/forms/Input.tsx';
import { Badge } from '@/shared/components/ui/Badge.tsx';
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
import { useState } from 'react';

interface ProductVariantsFormSectionProps {
  isEdit?: boolean;
  onRemoveVariant?: (variantId: string) => void;
}

export function ProductVariantsFormSection({
  isEdit,
  onRemoveVariant,
}: ProductVariantsFormSectionProps) {
  const {
    control,
    register,
    formState: { errors },
    watch,
    setValue,
  } = useFormContext<ProductFormData>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'variants',
  });

  const [attributeKey, setAttributeKey] = useState('');
  const [attributeValue, setAttributeValue] = useState('');
  const [editingVariantIndex, setEditingVariantIndex] = useState<number | null>(
    null
  );

  const variants = watch('variants');

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
    const variantId = variants[variantIndex]?.id;
    if (isEdit && variantId && onRemoveVariant) {
      onRemoveVariant(variantId);
    }
    remove(variantIndex);
  };

  const getTotalStock = () =>
    variants.reduce((sum, v) => sum + (v.quantity || 0), 0);

  return (
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
                ${Math.min(...variants.map((v) => v.price || 0)).toFixed(2)} - $
                {Math.max(...variants.map((v) => v.price || 0)).toFixed(2)}
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
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
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
  );
}
