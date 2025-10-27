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
import { Upload, X } from 'lucide-react';
import { useState } from 'react';
import { Textarea } from '@/shared/components/forms/Textarea.tsx';

const newsSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  excerpt: z.string().min(10, 'Excerpt must be at least 10 characters'),
  content: z.string().min(50, 'Content must be at least 50 characters'),
  tags: z.array(z.string()).min(1, 'At least one tag is required'),
});

export type NewsFormData = z.infer<typeof newsSchema>;

interface NewsFormProps {
  defaultValues?: Partial<NewsFormData>;
  onSubmit: (data: NewsFormData) => Promise<void>;
  isLoading: boolean;
  isEdit?: boolean;
  existingImage?: string;
  onRemoveImage?: () => void;
}

export function NewsForm({
  defaultValues,
  onSubmit,
  isLoading,
  isEdit = false,
  existingImage,
  onRemoveImage,
}: NewsFormProps) {
  const [image, setImage] = useState<File | null>(null);
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
      excerpt: '',
      content: '',
      tags: [],
    },
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
    }
  };

  const removeImage = () => {
    setImage(null);
    onRemoveImage?.();
  };

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
    await onSubmit({ ...data, tags });
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

          <FormField label="Excerpt" error={errors.excerpt} required>
            <Textarea
              {...register('excerpt')}
              placeholder="Brief summary of the news..."
              rows={2}
              error={!!errors.excerpt}
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
              onKeyPress={(e) =>
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
          <CardTitle>Featured Image (Optional)</CardTitle>
        </CardHeader>
        <CardContent>
          {(existingImage || image) && (
            <div className="mb-4">
              <div className="relative group aspect-video bg-muted rounded-lg overflow-hidden">
                {image ? (
                  <img
                    src={URL.createObjectURL(image)}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : existingImage ? (
                  <img
                    src={existingImage}
                    alt="Current"
                    className="w-full h-full object-cover"
                  />
                ) : null}
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 h-8 w-8 bg-error
                  text-error-foreground rounded-full flex items-center
                  justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {!existingImage && !image && (
            <label className="block">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <div
                className="border-2 border-dashed
              border-border rounded-lg p-8 text-center cursor-pointer
              hover:bg-muted/50 transition-colors"
              >
                <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground mb-1">
                  Click to upload image
                </p>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG up to 5MB
                </p>
              </div>
            </label>
          )}
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
