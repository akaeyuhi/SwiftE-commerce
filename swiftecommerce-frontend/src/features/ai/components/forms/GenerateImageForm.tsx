import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/shared/components/ui/Button';
import { Textarea } from '@/shared/components/forms/Textarea';
import { GenerateImageRequest } from '@/features/ai/types/ai-generator.types';
import { Sparkles } from 'lucide-react';
import { FormField } from '@/shared/components/forms/FormField.tsx';

const imageSchema = z.object({
  prompt: z.string().min(10, 'Prompt must be at least 10 characters'),
});

interface GenerateImageFormProps {
  onSubmit: (data: GenerateImageRequest) => void;
  isLoading: boolean;
}

export function GenerateImageForm({
  onSubmit,
  isLoading,
}: GenerateImageFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GenerateImageRequest>({
    resolver: zodResolver(imageSchema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField label="Image Prompt" error={errors.prompt}>
        <Textarea
          {...register('prompt')}
          error={!!errors.prompt}
          placeholder="e.g., 'A photorealistic product shot of a sleek,
        black smartwatch on a marble surface...'"
          rows={4}
        />
      </FormField>

      <Button type="submit" loading={isLoading} disabled={isLoading}>
        <Sparkles className="h-4 w-4 mr-2" />
        {isLoading ? 'Generating...' : 'Generate Image'}
      </Button>
    </form>
  );
}
