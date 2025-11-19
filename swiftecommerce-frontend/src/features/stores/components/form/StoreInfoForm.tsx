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
import { toast } from 'sonner';
import { Store, Save } from 'lucide-react';
import { useStoreMutations } from '@/features/stores/hooks/useStoreMutations.ts';
import { StoreDto } from '@/features/stores/types/store.types.ts';

interface StoreInfoFormProps {
  store: StoreDto;
}

export function StoreInfoForm({ store }: StoreInfoFormProps) {
  const { updateStore } = useStoreMutations();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<UpdateStoreFormData>({
    resolver: zodResolver(updateStoreSchema),
    defaultValues: {
      name: store?.name,
      description: store?.description,
      city: store?.city,
      country: store?.country,
    },
  });

  const onSubmit = async (data: UpdateStoreFormData) => {
    if (!store || !data) {
      return;
    }
    await updateStore.mutateAsync(
      {
        id: store.id,
        data: { ...data },
      },
      {
        onSuccess: () => {
          toast.success('Store updated successfully!');
        },
      }
    );
  };

  return (
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
          <FormField
            label="Store country"
            error={errors.country}
            required
            hint="Specify where your store is located"
          >
            <Input
              {...register('country')}
              placeholder="USA"
              error={!!errors.name}
              autoFocus
            />
          </FormField>
          <FormField
            label="Store Name"
            error={errors.city}
            required
            hint="Specify in what city is yout store"
          >
            <Input
              {...register('city')}
              placeholder="New-York"
              error={!!errors.name}
              autoFocus
            />
          </FormField>
          <div className="flex items-center justify-between pt-4">
            <p className="text-sm text-muted-foreground">
              Store created on {store?.createdAt.toLocaleDateString()}
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
  );
}
