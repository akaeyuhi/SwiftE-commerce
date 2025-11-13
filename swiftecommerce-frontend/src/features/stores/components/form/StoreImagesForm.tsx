import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/Card';
import { ImageUpload } from '@/shared/components/forms/ImageUpload.tsx';
import { Button } from '@/shared/components/ui/Button';
import { Save } from 'lucide-react';
import { useUploadStoreFiles } from '@/features/stores/hooks/useUploadStoreFiles.ts';
import { StoreDto } from '../types/store.types';

interface StoreImagesFormProps {
  store: StoreDto;
}

export function StoreImagesForm({ store }: StoreImagesFormProps) {
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const imageUpload = useUploadStoreFiles(store!.id);

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

  const handleUpload = async () => {
    if (!bannerFile || !logoFile) {
      toast.error('No banner or logo file found!');
      return;
    }

    await imageUpload.mutateAsync(
      {
        logo: logoFile,
        banner: bannerFile,
      },
      {
        onSuccess: () => {
          toast.success('Updated images successfully!');
        },
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Store Images</CardTitle>
        <CardDescription>Edit banner and logo for your store</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <ImageUpload
          onFileSelect={onLogoUpload}
          label="Logo"
          aspectRatio="square"
          className="w-64 h-64 mb-16"
          initialImageUrl={store?.logoUrl}
        />
        <ImageUpload
          onFileSelect={onBannerUpload}
          label="Banner"
          className="w-96"
          initialImageUrl={store?.bannerUrl}
        />
      </CardContent>
      <Button
        onClick={handleUpload}
        disabled={imageUpload.isPending}
        loading={imageUpload.isPending}
      >
        <Save className="h-4 w-4 mr-2" />
        Upload new images
      </Button>
    </Card>
  );
}
