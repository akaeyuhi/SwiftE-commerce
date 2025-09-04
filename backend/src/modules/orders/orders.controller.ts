import { Controller, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { BaseController } from 'src/common/abstracts/base.controller';
import { Order } from 'src/entities/order.entity';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { StoreRolesGuard } from 'src/common/guards/store-roles.guard';

@Controller('orders')
@UseGuards(JwtAuthGuard, StoreRolesGuard)
export class OrdersController extends BaseController<
  Order,
  CreateOrderDto,
  UpdateOrderDto
> {
  constructor(private readonly ordersService: OrdersService) {
    super(ordersService);
  }
}
