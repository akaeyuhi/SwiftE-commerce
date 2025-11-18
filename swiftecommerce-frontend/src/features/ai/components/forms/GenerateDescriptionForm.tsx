import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/forms/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { GenerateDescriptionRequest } from '@/features/ai/types/ai-generator.types';
import { Sparkles, Trash2, Plus } from 'lucide-react';
import { FormField } from '@/shared/components/forms/FormField.tsx';

const descriptionSchema = z.object({
  name: z.string().min(3, 'Product name must be at least 3 characters'),
  productSpec: z.object({
    category: z.string().optional(),
    features: z.array(z.string()).optional(),
    price: z.number().optional(),
    material: z.string().optional(),
  }),
  tone: z.string().optional(),
});

interface GenerateDescriptionFormProps {
  onSubmit: (data: GenerateDescriptionRequest) => void;
  isLoading: boolean;
}

export function GenerateDescriptionForm({
  onSubmit,
  isLoading,
}: GenerateDescriptionFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<GenerateDescriptionRequest>({
    resolver: zodResolver(descriptionSchema),
    defaultValues: {
      tone: 'professional and engaging',
      productSpec: {
        features: [''],
      },
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'productSpec.features' as never,
  });

  const handleFormSubmit = (data: GenerateDescriptionRequest) => {
    const processedData = {
      ...data,
      productSpec: data.productSpec
        ? {
            ...data.productSpec,
            features: data.productSpec.features?.filter(Boolean),
          }
        : undefined,
    };
    onSubmit(processedData);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <FormField label="Product Name" error={errors.name} required>
        <Input
          {...register('name')}
          error={!!errors.name}
          placeholder="e.g., 'Wireless Noise-Cancelling Headphones'"
        />
      </FormField>

      <div className="border-t pt-6">
        <h3 className="text-lg font-medium mb-4">
          Product Specifications (Optional)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Category" error={errors.productSpec?.category}>
            <Input
              {...register('productSpec.category')}
              placeholder="e.g., 'Electronics'"
              error={!!errors.productSpec?.category}
            />
          </FormField>

          <FormField label="Material" error={errors.productSpec?.material}>
            <Input
              {...register('productSpec.material')}
              placeholder="e.g., 'Aluminum, Leather'"
              error={!!errors.productSpec?.material}
            />
          </FormField>

          <FormField label="Price" error={errors.productSpec?.price}>
            <Input
              type="number"
              step="0.01"
              {...register('productSpec.price', { valueAsNumber: true })}
              placeholder="299.99"
              error={!!errors.productSpec?.price}
            />
          </FormField>

          <FormField label="Tone">
            <Controller
              name="tone"
              control={control}
              render={({ field }) => (
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  value={field.value}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a tone..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional and engaging">
                      Professional & Engaging
                    </SelectItem>
                    <SelectItem value="casual and friendly">
                      Casual & Friendly
                    </SelectItem>
                    <SelectItem value="enthusiastic and vibrant">
                      Enthusiastic & Vibrant
                    </SelectItem>
                    <SelectItem value="luxurious and elegant">
                      Luxurious & Elegant
                    </SelectItem>
                    <SelectItem value="technical and detailed">
                      Technical & Detailed
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
        </div>
      </div>

      <div className="border-t pt-6">
        <div className="flex items-center justify-between mb-4">
          <label className="text-sm font-medium text-foreground">
            Key Features
          </label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append('')}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Feature
          </Button>
        </div>

        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-start gap-2">
              <div className="flex-shrink-0">
                <FormField error={errors.productSpec?.features?.[index]}>
                  <Input
                    {...register(`productSpec.features.${index}` as const)}
                    placeholder={`Feature #${index + 1}`}
                    error={!!errors.productSpec?.features?.[index]}
                  />
                </FormField>
              </div>
              <Button
                type="button"
                variant="error"
                size="icon"
                onClick={() => remove(index)}
                disabled={fields.length === 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        {fields.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No features added yet. Click &#34;Add Feature&#34; to get started.
          </p>
        )}
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          type="submit"
          loading={isLoading}
          disabled={isLoading}
          className="flex-1"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          {isLoading ? 'Generating...' : 'Generate Description'}
        </Button>
      </div>
    </form>
  );
}
