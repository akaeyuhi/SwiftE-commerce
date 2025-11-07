import { useFormContext } from 'react-hook-form';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/Card';
import { Input } from '@/shared/components/forms/Input';
import { FormField } from '@/shared/components/forms/FormField';
import { CreditCard } from 'lucide-react';
import { CheckoutFormData } from '@/lib/validations/checkout.schemas.ts';

export function PaymentForm() {
  const {
    register,
    formState: { errors },
  } = useFormContext<CheckoutFormData>();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField label="Card Number" error={errors.cardNumber} required>
          <Input
            {...register('cardNumber')}
            placeholder="1234 5678 9012 3456"
            error={!!errors.cardNumber}
          />
        </FormField>
        <FormField label="Name on Card" error={errors.cardName} required>
          <Input {...register('cardName')} error={!!errors.cardName} />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Expiry Date" error={errors.expiryDate} required>
            <Input
              {...register('expiryDate')}
              placeholder="MM/YY"
              error={!!errors.expiryDate}
            />
          </FormField>
          <FormField label="CVV" error={errors.cvv} required>
            <Input
              {...register('cvv')}
              placeholder="123"
              error={!!errors.cvv}
            />
          </FormField>
        </div>
      </CardContent>
    </Card>
  );
}
