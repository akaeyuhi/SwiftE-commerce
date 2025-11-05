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
  updateStoreSchema,
  UpdateStoreFormData,
} from '@/lib/validations/store.schemas';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { Store, Save, AlertTriangle } from 'lucide-react';
import { DeleteStoreDialog } from '@/features/stores/components/DeleteStoreDialog.tsx';
import { ImageUpload } from '@/shared/components/forms/ImageUpload.tsx';
import { useStore } from '@/features/stores/hooks/useStores.ts';
import { useParams } from 'react-router-dom';
import { useNavigate } from '@/shared/hooks/useNavigate.ts';
import { useStoreMutations } from '@/features/stores/hooks/useStoreMutations.ts';
import { useUploadStoreFiles } from '@/features/stores/hooks/useUploadStoreFiles.ts';

export function StoreSettingsPage() {
  const [isDeleting, setIsDeleting] = useState(false);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const params = useParams();
  const navigate = useNavigate();

  const { data: currentStore } = useStore(params.storeId!);

  const { updateStore } = useStoreMutations();

  // // Mock store data
  // const currentStore = {
  //   id: '1',
  //   name: 'Tech Haven',
  //   description:
  //     'Your one-stop shop for the latest tech gadgets and accessories',
  //   createdAt: '2024-01-15',
  //   bannerUrl: '',
  //   logoUrl: '',
  // };

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<UpdateStoreFormData>({
    resolver: zodResolver(updateStoreSchema),
    defaultValues: {
      name: currentStore?.name,
      description: currentStore?.description,
    },
  });

  const imageUpload = useUploadStoreFiles(currentStore!.id);
  const { deleteStore } = useStoreMutations();

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

  const onSubmit = async (data: UpdateStoreFormData) => {
    if (!currentStore || !data) {
      return;
    }
    await updateStore.mutateAsync(
      {
        id: currentStore.id,
        data: { ...data },
      },
      {
        onSuccess: () => {
          toast.success('Store updated successfully!');
          console.log('Updating store', data);
          navigate.toStoreOverview(currentStore.id);
        },
      }
    );
  };

  const handleDeleteStore = async () => {
    setIsDeleting(true);
    await deleteStore.mutateAsync(currentStore!.id, {
      onSuccess: () => {
        toast.success('Store deleted successfully');
        setIsDeleting(false);
        navigate.toMyStores();
      },
      onError: () => setIsDeleting(false),
    });
  };

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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Store Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your store information and preferences
        </p>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Store className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Update your store&#39;s name and description
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <FormField label="Store Name" error={errors.name}>
              <Input
                {...register('name')}
                placeholder="Store name"
                error={!!errors.name}
              />
            </FormField>

            <FormField label="Store Description" error={errors.description}>
              <Textarea
                {...register('description')}
                placeholder="Describe your store..."
                rows={5}
                error={!!errors.description}
              />
            </FormField>
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Store created on{' '}
                {new Date(currentStore?.createdAt ?? 0).toLocaleDateString()}
              </p>
              <Button
                type="submit"
                disabled={!isDirty || updateStore.isPending}
                loading={updateStore.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Store Images Card */}
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
            initialImageUrl={currentStore?.logoUrl}
          />
          <ImageUpload
            onFileSelect={onBannerUpload}
            label="Banner"
            className="w-96"
            initialImageUrl={currentStore?.bannerUrl}
          />
        </CardContent>
        <Button
          onClick={handleUpload}
          disabled={!isDirty || imageUpload.isPending}
          loading={imageUpload.isPending}
        >
          <Save className="h-4 w-4 mr-2" />
          Upload new images
        </Button>
      </Card>

      {/* Store Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Store Statistics</CardTitle>
          <CardDescription>Overview of your store performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">
                Total Products
              </p>
              <p className="text-2xl font-bold text-foreground">24</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Total Orders</p>
              <p className="text-2xl font-bold text-foreground">156</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">
                Total Revenue
              </p>
              <p className="text-2xl font-bold text-foreground">$12,450</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Followers</p>
              <p className="text-2xl font-bold text-foreground">89</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-error">
        <CardHeader>
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-error" />
            <div>
              <CardTitle className="text-error">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible actions for your store
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div
              className="flex items-center justify-between
            p-4 bg-error/5 border border-error/20 rounded-lg"
            >
              <div>
                <h4 className="font-semibold text-foreground mb-1">
                  Delete Store
                </h4>
                <p className="text-sm text-muted-foreground">
                  Once deleted, all data will be permanently removed
                </p>
              </div>
              <DeleteStoreDialog
                isDeleting={isDeleting}
                handleDeleteStore={handleDeleteStore}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
