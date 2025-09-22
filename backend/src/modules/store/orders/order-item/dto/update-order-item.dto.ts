import { PartialType } from '@nestjs/mapped-types';
import { CreateOrderItemDto } from 'src/modules/store/orders/order-item/dto/create-order-item.dto';

export class UpdateOrderItemDto extends PartialType(CreateOrderItemDto) {}
