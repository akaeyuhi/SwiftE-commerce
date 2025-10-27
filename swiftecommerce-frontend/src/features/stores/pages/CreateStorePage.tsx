import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { useState } from 'react';
import { toast } from 'sonner';
import { Store, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Link } from '@/shared/components/ui/Link';
import { ROUTES } from '@/app/routes/routes';

export function CreateStorePage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateStoreFormData>({
    resolver: zodResolver(createStoreSchema),
  });

  const onSubmit = async (data: CreateStoreFormData) => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual API call
      // const response = await storeService.createStore(data)

      // Mock API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      console.log('Creating store:', data);

      toast.success('Store created successfully!');
      navigate.toStoreOverview('data.storeId');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create store');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            to={ROUTES.DASHBOARD}
            className="inline-flex items-center gap-2
            text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Create Your Store
          </h1>
          <p className="text-muted-foreground">
            Start selling in just a few steps
          </p>
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="flex items-start gap-3 p-4 bg-card border border-border rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-foreground text-sm mb-1">
                Easy Setup
              </h3>
              <p className="text-xs text-muted-foreground">
                Get started in minutes with our simple process
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-card border border-border rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-foreground text-sm mb-1">
                No Fees
              </h3>
              <p className="text-xs text-muted-foreground">
                Start selling with zero upfront costs
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-card border border-border rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-foreground text-sm mb-1">
                Full Control
              </h3>
              <p className="text-xs text-muted-foreground">
                Manage your products and orders your way
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Store className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Store Information</CardTitle>
                <CardDescription>Tell us about your store</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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

              <div className="flex gap-4 pt-4">
                <Button
                  type="submit"
                  className="flex-1"
                  size="lg"
                  loading={isLoading}
                >
                  Create Store
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
          </CardContent>
        </Card>

        {/* Info Box */}
        <div className="mt-6 bg-muted/50 border border-border rounded-lg p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">
            What happens next?
          </h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>✓ Your store will be created instantly</li>
            <li>✓ You can start adding products right away</li>
            <li>✓ Invite team members to help manage your store</li>
            <li>✓ Customize your store settings anytime</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
