import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/Card';
import { OrderInfo } from '../../types/order.types';
import { MapPin } from 'lucide-react';

interface OrderShippingInfoProps {
  shipping: OrderInfo;
}

export function OrderShippingInfo({ shipping }: OrderShippingInfoProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Shipping Address
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-foreground">{shipping.addressLine1}</p>
        <p className="text-foreground">{shipping.addressLine2}</p>
        <p className="text-foreground">
          {shipping.city}, {shipping.postalCode}
        </p>
        <p className="text-foreground">{shipping.country}</p>
      </CardContent>
    </Card>
  );
}
