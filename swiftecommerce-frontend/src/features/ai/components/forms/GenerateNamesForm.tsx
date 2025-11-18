import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/forms/Input';
import { Textarea } from '@/shared/components/forms/Textarea';
import { GenerateNamesRequest } from '@/features/ai/types/ai-generator.types';
import { Sparkles } from 'lucide-react';
import { FormField } from '@/shared/components/forms/FormField.tsx';

const namesSchema = z.object({
  seed: z.string().min(3, 'Seed words must be at least 3 characters'),
  storeStyle: z.string().min(3, 'Store style must be at least 3 characters'),
  count: z.number().min(1).max(20).optional(),
});

interface GenerateNamesFormProps {
  onSubmit: (data: GenerateNamesRequest) => void;
  isLoading: boolean;
}

export function GenerateNamesForm({
  onSubmit,
  isLoading,
}: GenerateNamesFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GenerateNamesRequest>({
    resolver: zodResolver(namesSchema),
    defaultValues: {
      count: 6,
      storeStyle: 'modern and minimalist',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField label="Seed Words or Product Idea" error={errors.seed}>
        <Textarea
          {...register('seed')}
          error={!!errors.seed}
          placeholder="e.g., 'sustainable, high-quality coffee'"
          rows={3}
        />
      </FormField>

      <FormField label="Store Style" error={errors.storeStyle}>
        <Input
          {...register('storeStyle')}
          error={!!errors.storeStyle}
          placeholder="e.g., 'vintage and rustic'"
        />
      </FormField>

      <FormField label="Number of Names to Generate" error={errors.count}>
        <Input
          type="number"
          {...register('count', { valueAsNumber: true })}
          error={!!errors.count}
          placeholder="1-20"
        />
      </FormField>

      <Button type="submit" loading={isLoading} disabled={isLoading}>
        <Sparkles className="h-4 w-4 mr-2" />
        {isLoading ? 'Generating...' : 'Generate Names'}
      </Button>
    </form>
  );
}
