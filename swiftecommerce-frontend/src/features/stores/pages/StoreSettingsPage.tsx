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
import { useState } from 'react';
import { toast } from 'sonner';
import { Store, Save, AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/components/ui/alert-dialog';

export function StoreSettingsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Mock store data
  const currentStore = {
    id: '1',
    name: 'Tech Haven',
    description:
      'Your one-stop shop for the latest tech gadgets and accessories',
    createdAt: '2024-01-15',
  };

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<UpdateStoreFormData>({
    resolver: zodResolver(updateStoreSchema),
    defaultValues: {
      name: currentStore.name,
      description: currentStore.description,
    },
  });

  const onSubmit = async (data: UpdateStoreFormData) => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual API call
      // await storeService.updateStore(currentStore.id, data)

      await new Promise((resolve) => setTimeout(resolve, 1000));

      console.log('Updating store:', data);

      toast.success('Store updated successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update store');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteStore = async () => {
    setIsDeleting(true);
    try {
      // TODO: Replace with actual API call
      // await storeService.deleteStore(currentStore.id)

      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast.success('Store deleted successfully');
      // Redirect to dashboard or home
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete store');
    } finally {
      setIsDeleting(false);
    }
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
                {new Date(currentStore.createdAt).toLocaleDateString()}
              </p>
              <Button
                type="submit"
                disabled={!isDirty || isLoading}
                loading={isLoading}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
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
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="error" disabled={isDeleting}>
                    Delete Store
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Are you absolutely sure?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete
                      your store and remove all associated data including
                      products, orders, and team members.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteStore}
                      className="bg-error text-error-foreground hover:bg-error/90"
                    >
                      {isDeleting ? 'Deleting...' : 'Yes, delete store'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
