import { PartialType } from '@nestjs/mapped-types';
import { CreateOrderDto } from 'src/modules/store/orders/dto/create-order.dto';

export class UpdateOrderDto extends PartialType(CreateOrderDto) {}
