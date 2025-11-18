import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/forms/Input';
import { Textarea } from '@/shared/components/forms/Textarea';
import { GenerateCustomRequest } from '@/features/ai/types/ai-generator.types';
import { Sparkles } from 'lucide-react';
import { FormField } from '@/shared/components/forms/FormField.tsx';

const customSchema = z.object({
  prompt: z.string().min(10, 'Prompt must be at least 10 characters'),
  options: z
    .object({
      maxTokens: z.number().min(10).max(2000).optional(),
      temperature: z.number().min(0).max(2).optional(),
      model: z.string().optional(),
    })
    .optional(),
});

interface GenerateCustomFormProps {
  onSubmit: (data: GenerateCustomRequest) => void;
  isLoading: boolean;
}

export function GenerateCustomForm({
  onSubmit,
  isLoading,
}: GenerateCustomFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GenerateCustomRequest>({
    resolver: zodResolver(customSchema),
    defaultValues: {
      options: {
        maxTokens: 256,
        temperature: 0.7,
      },
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField label="Custom prompt" error={errors.prompt}>
        <Textarea
          {...register('prompt')}
          placeholder="Enter any instruction for the AI..."
          rows={6}
          error={!!errors.prompt}
        />
      </FormField>

      <h3 className="text-lg font-medium pt-4">Advanced Options (Optional)</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormField label="Max Tokens" error={errors.options?.maxTokens}>
          <Input
            type="number"
            {...register('options.maxTokens', { valueAsNumber: true })}
            placeholder="e.g., 512"
            error={!!errors.options?.maxTokens}
          />
        </FormField>

        <FormField label="Temperature" error={errors.options?.temperature}>
          <Input
            type="number"
            step="0.1"
            {...register('options.temperature', { valueAsNumber: true })}
            placeholder="0.0 - 2.0"
            error={!!errors.options?.temperature}
          />
        </FormField>

        <FormField label="Model" error={errors.options?.model}>
          <Input
            {...register('options.model')}
            placeholder="e.g., 'gpt-4'"
            error={!!errors.options?.model}
          />
        </FormField>
      </div>

      <Button type="submit" loading={isLoading} disabled={isLoading}>
        <Sparkles className="h-4 w-4 mr-2" />
        {isLoading ? 'Generating...' : 'Generate with Custom Prompt'}
      </Button>
    </form>
  );
}
