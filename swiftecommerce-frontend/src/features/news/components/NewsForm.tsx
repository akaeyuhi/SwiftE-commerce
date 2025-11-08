import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/forms/Input';
import { FormField } from '@/shared/components/forms/FormField';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { Wand2, X } from 'lucide-react';
import { useState } from 'react';
import { Textarea } from '@/shared/components/forms/Textarea.tsx';
import { MultiImageUpload } from '@/shared/components/forms/MultiImageUpload.tsx';

const newsSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  content: z.string().min(50, 'Content must be at least 50 characters'),
  tags: z.array(z.string()).min(1, 'At least one tag is required'),
});

export type NewsFormData = z.infer<typeof newsSchema>;

interface NewsFormProps {
  defaultValues?: Partial<NewsFormData>;
  onSubmit: (data: NewsFormData, newImages: File[]) => Promise<void>;
  isLoading: boolean;
  isEdit?: boolean;
  existingImageUrls?: string[];
  onRemoveExistingImage?: (index: number) => void;
  onGenerate?: () => void;
}

export function NewsForm({
  defaultValues,
  onSubmit,
  isLoading,
  isEdit = false,
  existingImageUrls = [],
  onRemoveExistingImage,
  onGenerate,
}: NewsFormProps) {
  const [newImages, setNewImages] = useState<File[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(defaultValues?.tags || []);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    setValue,
  } = useForm<NewsFormData>({
    resolver: zodResolver(newsSchema),
    defaultValues: defaultValues || {
      title: '',
      content: '',
      tags: [],
    },
  });

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      const newTags = [...tags, tagInput.trim()];
      setTags(newTags);
      setValue('tags', newTags, { shouldDirty: true });
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    const newTags = tags.filter((tag) => tag !== tagToRemove);
    setTags(newTags);
    setValue('tags', newTags, { shouldDirty: true });
  };

  const handleFormSubmit = async (data: NewsFormData) => {
    await onSubmit({ ...data, tags }, newImages);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField label="Title" error={errors.title} required>
            <Input
              {...register('title')}
              placeholder="Enter news title..."
              error={!!errors.title}
            />
          </FormField>

          <FormField label="Content" error={errors.content} required>
            <Textarea
              {...register('content')}
              placeholder="Full news content..."
              rows={10}
              error={!!errors.content}
            />
          </FormField>
          {onGenerate && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onGenerate}
            >
              <Wand2 className="h-4 w-4 mr-2" />
              Generate with AI
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Tags */}
      <Card>
        <CardHeader>
          <CardTitle>Tags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="Add a tag..."
              onKeyDown={(e) =>
                e.key === 'Enter' && (e.preventDefault(), addTag())
              }
            />
            <Button type="button" onClick={addTag}>
              Add
            </Button>
          </div>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-2 hover:text-error"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          {errors.tags && (
            <p className="text-xs text-error">{errors.tags.message}</p>
          )}
        </CardContent>
      </Card>

      {/* Featured Image */}
      <Card>
        <CardHeader>
          <CardTitle>Images</CardTitle>
        </CardHeader>
        <CardContent>
          <MultiImageUpload
            label="News Images"
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
          {isEdit ? 'Update News' : 'Publish News'}
        </Button>
      </div>
    </form>
  );
}
