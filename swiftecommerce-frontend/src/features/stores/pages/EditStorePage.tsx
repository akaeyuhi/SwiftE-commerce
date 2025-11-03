import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useParams } from 'react-router-dom';
import { useNavigate } from '@/shared/hooks/useNavigate';
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
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Store, ArrowLeft, Upload, X } from 'lucide-react';

interface StoreEditData extends CreateStoreFormData {
  bannerUrl?: string;
  logoUrl?: string;
}

export function EditStorePage() {
  const { storeId } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [storeData, setStoreData] = useState<StoreEditData | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateStoreFormData>({
    resolver: zodResolver(createStoreSchema),
  });

  useEffect(() => {
    // Mock fetch store data
    const mockStore: StoreEditData = {
      name: 'Tech Haven',
      description: 'Your premium source for technology products',
      bannerUrl: '/path/to/banner.jpg',
      logoUrl: '/path/to/logo.jpg',
    };

    setStoreData(mockStore);
    setBannerPreview(mockStore.bannerUrl!);
    setLogoPreview(mockStore.logoUrl!);

    reset({
      name: mockStore.name,
      description: mockStore.description,
    });
  }, [storeId, reset]);

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'banner' | 'logo'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = type === 'banner' ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(
        `File size must be less than ${type === 'banner' ? '10MB' : '5MB'}`
      );
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const preview = reader.result as string;
      if (type === 'banner') {
        setBannerFile(file);
        setBannerPreview(preview);
      } else {
        setLogoFile(file);
        setLogoPreview(preview);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = (type: 'banner' | 'logo') => {
    if (type === 'banner') {
      setBannerFile(null);
      setBannerPreview(null);
    } else {
      setLogoFile(null);
      setLogoPreview(null);
    }
  };

  const onSubmit = async (data: CreateStoreFormData) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('description', data.description);

      if (bannerFile) {
        formData.append('banner', bannerFile);
      }
      if (logoFile) {
        formData.append('logo', logoFile);
      }

      // TODO: Replace with actual API call
      // const response = await storeService.updateStore(storeId, formData)

      // Mock API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      console.log('Updating store:', data);

      toast.success('Store updated successfully!');
      navigate.back();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update store');
    } finally {
      setIsLoading(false);
    }
  };

  if (!storeData) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate.back()}
            className="inline-flex items-center gap-2 text-sm
            text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Edit Store
          </h1>
          <p className="text-muted-foreground">
            Update your store information and images
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Store Images Card */}
          <Card>
            <CardHeader>
              <CardTitle>Store Images</CardTitle>
              <CardDescription>
                Update banner and logo for your store
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Banner Upload */}
              <div>
                <label className="text-sm font-semibold text-foreground mb-3 block">
                  Store Banner
                </label>
                <div className="relative">
                  {bannerPreview ? (
                    <div className="relative">
                      <img
                        src={bannerPreview}
                        alt="Banner Preview"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage('banner')}
                        className="absolute top-2 right-2 h-8 w-8 bg-background/80 rounded-full
                        flex items-center justify-center hover:bg-background transition-colors"
                      >
                        <X className="h-4 w-4 text-foreground" />
                      </button>
                      <label className="absolute bottom-2 left-2">
                        <Button type="button" size="sm" variant="secondary">
                          <Upload className="h-4 w-4 mr-2" />
                          Change Banner
                        </Button>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, 'banner')}
                          className="hidden"
                        />
                      </label>
                    </div>
                  ) : (
                    <div
                      className="w-full h-48 bg-muted rounded-lg flex items-center justify-center
                    border-2 border-dashed border-border hover:border-primary transition-colors"
                    >
                      <label className="flex flex-col items-center cursor-pointer">
                        <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                        <span className="text-sm font-medium text-foreground">
                          Click to upload banner
                        </span>
                        <span className="text-xs text-muted-foreground">
                          1920 x 400px recommended. Max 10MB
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, 'banner')}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Logo Upload */}
              <div>
                <label className="text-sm font-semibold text-foreground mb-3 block">
                  Store Logo
                </label>
                <div className="relative inline-block">
                  {logoPreview ? (
                    <div className="relative inline-block">
                      <img
                        src={logoPreview}
                        alt="Logo Preview"
                        className="h-24 w-24 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage('logo')}
                        className="absolute top-0 right-0 h-6 w-6
                        bg-background/80 rounded-full flex items-center
                        justify-center hover:bg-background
                        transition-colors translate-x-1 -translate-y-1"
                      >
                        <X className="h-3 w-3 text-foreground" />
                      </button>
                      <label
                        className="absolute inset-0 flex items-center
                        justify-center bg-black/50 rounded-lg opacity-0
                      hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <Upload className="h-5 w-5 text-white" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, 'logo')}
                          className="hidden"
                        />
                      </label>
                    </div>
                  ) : (
                    <label
                      className="h-24 w-24 bg-muted rounded-lg flex items-center justify-center
                    border-2 border-dashed border-border
                    hover:border-primary transition-colors cursor-pointer"
                    >
                      <div className="flex flex-col items-center">
                        <Upload className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'logo')}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Square image. Max 5MB
                </p>
              </div>
            </CardContent>
          </Card>

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
                  <CardDescription>Update store details</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField label="Store Name" error={errors.name} required>
                <Input
                  {...register('name')}
                  placeholder="Store name"
                  error={!!errors.name}
                />
              </FormField>

              <FormField
                label="Store Description"
                error={errors.description}
                required
              >
                <Textarea
                  {...register('description')}
                  placeholder="Store description..."
                  rows={5}
                  error={!!errors.description}
                />
              </FormField>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-4">
            <Button
              type="submit"
              className="flex-1"
              size="lg"
              loading={isLoading}
            >
              Save Changes
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate.back()}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
