import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/forms/Input';
import { Textarea } from '@/shared/components/forms/Textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { GeneratePostRequest } from '@/features/ai/types/ai-generator.types';
import { Sparkles } from 'lucide-react';
import { Controller } from 'react-hook-form';
import { FormField } from '@/shared/components/forms/FormField.tsx';

const postSchema = z.object({
  topic: z.string().min(10, 'Topic must be at least 10 characters'),
  tone: z.string().optional(),
  length: z.number().min(50).max(500).optional(),
});

interface GeneratePostFormProps {
  onSubmit: (data: GeneratePostRequest) => void;
  isLoading: boolean;
}

export function GeneratePostForm({
  onSubmit,
  isLoading,
}: GeneratePostFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<GeneratePostRequest>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      tone: 'informative and engaging',
      length: 200,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField label="News Topic or Announcement" error={errors.topic}>
        <Textarea
          {...register('topic')}
          error={!!errors.topic}
          placeholder="e.g., 'New summer collection has arrived!'"
          rows={3}
        />
      </FormField>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            Tone
          </label>
          <Controller
            name="tone"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a tone..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="informative and engaging">
                    Informative & Engaging
                  </SelectItem>
                  <SelectItem value="promotional and exciting">
                    Promotional & Exciting
                  </SelectItem>
                  <SelectItem value="formal and official">
                    Formal & Official
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <FormField label="Approximate Length (words)" error={errors.length}>
          <Input
            type="number"
            step="10"
            {...register('length', { valueAsNumber: true })}
            error={!!errors.length}
            placeholder="50-500"
          />
        </FormField>
      </div>

      <Button type="submit" loading={isLoading} disabled={isLoading}>
        <Sparkles className="h-4 w-4 mr-2" />
        {isLoading ? 'Generating...' : 'Generate Post'}
      </Button>
    </form>
  );
}
