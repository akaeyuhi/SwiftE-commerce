import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/forms/Input';
import { Textarea } from '@/shared/components/forms/Textarea';
import { FormField } from '@/shared/components/forms/FormField';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/Card';
import {
  createStoreSchema,
  CreateStoreFormData,
} from '@/lib/validations/store.schemas';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { Store, Save } from 'lucide-react';
import { ImageUpload } from '@/shared/components/forms/ImageUpload.tsx';
import { useStoreMutations } from '@/features/stores/hooks/useStoreMutations.ts';
import { useAuth } from '@/app/store';
import { useNavigate } from '@/shared/hooks/useNavigate.ts';

interface CreateStoreFormProps {
  onSuccess?: () => void;
}

export function CreateStoreForm({ onSuccess }: CreateStoreFormProps) {
  const navigate = useNavigate();
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const { createStore } = useStoreMutations();
  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateStoreFormData>({
    resolver: zodResolver(createStoreSchema),
  });

  const onBannerUpload = useCallback(
    (file: File | null) => {
      setBannerFile(file);
    },
    [setBannerFile]
  );

  const onLogoUpload = useCallback(
    (file: File | null) => {
      setLogoFile(file);
    },
    [setLogoFile]
  );

  const onSubmit = async (data: CreateStoreFormData) => {
    if (!bannerFile || !logoFile) {
      toast.error('Please upload both banner and logo images');
      return;
    }
    const formData = new FormData();
    formData.append('banner', bannerFile);
    formData.append('logo', logoFile);

    await createStore.mutateAsync(
      { ...data, ...formData, ownerId: user!.id },
      {
        onSuccess: () => {
          toast.success('Store created successfully!');
          onSuccess?.();
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Store Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div
              className="h-12 w-12 bg-primary/10 rounded-lg
                flex items-center justify-center"
            >
              <Store className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Store Information</CardTitle>
              <CardDescription>Tell us about your store</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <FormField
            label="Store Name"
            error={errors.name}
            required
            hint="Choose a unique name for your store"
          >
            <Input
              {...register('name')}
              placeholder="e.g., Tech Haven, Fashion Hub"
              error={!!errors.name}
              autoFocus
            />
          </FormField>

          <FormField
            label="Store Description"
            error={errors.description}
            required
            hint="Tell customers what makes your store special"
          >
            <Textarea
              {...register('description')}
              placeholder="Describe your store, products, and what makes you unique..."
              rows={5}
              error={!!errors.description}
            />
          </FormField>
        </CardContent>
      </Card>

      {/* Store Images Card */}
      <Card>
        <CardHeader>
          <CardTitle>Store Images</CardTitle>
          <CardDescription>Add banner and logo for your store</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ImageUpload
            onFileSelect={onLogoUpload}
            label="Logo"
            aspectRatio="square"
            className="w-64 h-64 mb-16"
          />
          <ImageUpload
            onFileSelect={onBannerUpload}
            label="Banner"
            className="w-full"
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        <Button
          type="submit"
          className="flex-1"
          size="lg"
          loading={createStore.isPending}
        >
          <Save className="h-4 w-4 mr-2" />
          Create Store
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate.back()}
          disabled={createStore.isPending}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
