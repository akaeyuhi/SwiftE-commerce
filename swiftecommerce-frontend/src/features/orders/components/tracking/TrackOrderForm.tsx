import { Card, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/forms/Input';
import { FormField } from '@/shared/components/forms/FormField';

interface TrackOrderFormProps {
  orderNumber: string;
  onOrderNumberChange: (value: string) => void;
  onTrack: (e: React.FormEvent) => void;
  isLoading: boolean;
}

export function TrackOrderForm({
  orderNumber,
  onOrderNumberChange,
  onTrack,
  isLoading,
}: TrackOrderFormProps) {
  return (
    <Card className="mb-8">
      <CardContent className="p-6">
        <form onSubmit={onTrack} className="space-y-4">
          <FormField label="Order Number" required>
            <Input
              placeholder="e.g., ORD-2024-001"
              value={orderNumber}
              onChange={(e) => onOrderNumberChange(e.target.value)}
              required
            />
          </FormField>
          <Button type="submit" loading={isLoading}>
            {isLoading ? 'Tracking...' : 'Track Order'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
