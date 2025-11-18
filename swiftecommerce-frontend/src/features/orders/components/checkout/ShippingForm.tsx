import { useFormContext } from 'react-hook-form';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/Card';
import { Input } from '@/shared/components/forms/Input';
import { FormField } from '@/shared/components/forms/FormField';
import { MapPin } from 'lucide-react';
import { CheckoutFormData } from '@/lib/validations/checkout.schemas.ts';

export function ShippingForm() {
  const {
    register,
    formState: { errors },
  } = useFormContext<CheckoutFormData>();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Shipping Address
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="First Name" error={errors.firstName} required>
            <Input {...register('firstName')} error={!!errors.firstName} />
          </FormField>
          <FormField label="Last Name" error={errors.lastName} required>
            <Input {...register('lastName')} error={!!errors.lastName} />
          </FormField>
        </div>
        <FormField label="Email" error={errors.email} required>
          <Input {...register('email')} type="email" error={!!errors.email} />
        </FormField>
        <FormField label="Phone" error={errors.phone} required>
          <Input {...register('phone')} error={!!errors.phone} />
        </FormField>
        <FormField label="Street Address" error={errors.addressLine1} required>
          <Input {...register('addressLine1')} error={!!errors.addressLine1} />
        </FormField>
        <FormField
          label="Building address"
          error={errors.addressLine2}
          required
        >
          <Input {...register('addressLine2')} error={!!errors.addressLine2} />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="City" error={errors.city} required>
            <Input {...register('city')} error={!!errors.city} />
          </FormField>
          <FormField label="State" error={errors.state} required>
            <Input {...register('state')} error={!!errors.state} />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="ZIP Code" error={errors.postalCode} required>
            <Input {...register('postalCode')} error={!!errors.postalCode} />
          </FormField>
          <FormField label="Country" error={errors.country} required>
            <Input {...register('country')} error={!!errors.country} />
          </FormField>
        </div>
      </CardContent>
    </Card>
  );
}
