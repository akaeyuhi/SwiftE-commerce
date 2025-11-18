import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/forms/Input';
import { Textarea } from '@/shared/components/forms/Textarea';
import { GenerateIdeasRequest } from '@/features/ai/types/ai-generator.types';
import { Sparkles } from 'lucide-react';
import { FormField } from '@/shared/components/forms/FormField.tsx';

const ideasSchema = z.object({
  seed: z.string().min(3, 'Seed words must be at least 3 characters'),
  storeStyle: z.string().min(3, 'Store style must be at least 3 characters'),
  count: z.number().min(1).max(20).optional(),
});

interface GenerateIdeasFormProps {
  onSubmit: (data: GenerateIdeasRequest) => void;
  isLoading: boolean;
}

export function GenerateIdeasForm({
  onSubmit,
  isLoading,
}: GenerateIdeasFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GenerateIdeasRequest>({
    resolver: zodResolver(ideasSchema),
    defaultValues: {
      count: 3,
      storeStyle: 'modern and minimalist',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField label="Seed Concepts or Keywords" error={errors.seed}>
        <Textarea
          {...register('seed')}
          error={!!errors.seed}
          placeholder="e.g., 'home office, productivity, eco-friendly'"
          rows={3}
        />
      </FormField>

      <FormField label="Store Style" error={errors.storeStyle}>
        <Input
          {...register('storeStyle')}
          error={!!errors.storeStyle}
          placeholder="e.g., 'bohemian and natural'"
        />
      </FormField>

      <FormField label="Number of Ideas to Generate" error={errors.count}>
        <Input
          type="number"
          {...register('count', { valueAsNumber: true })}
          error={!!errors.count}
          placeholder="1-20"
        />
      </FormField>

      <Button type="submit" loading={isLoading} disabled={isLoading}>
        <Sparkles className="h-4 w-4 mr-2" />
        {isLoading ? 'Generating...' : 'Generate Ideas'}
      </Button>
    </form>
  );
}
