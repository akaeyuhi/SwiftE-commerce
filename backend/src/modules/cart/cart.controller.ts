import { Controller, UseGuards } from '@nestjs/common';
import { CartService } from './cart.service';
import { CreateCartDto } from './dto/create-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';
import { BaseController } from 'src/common/abstracts/base.controller';
import { ShoppingCart } from 'src/entities/cart.entity';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { StoreRolesGuard } from 'src/common/guards/store-roles.guard';

@Controller('stores/:storeId/cart')
@UseGuards(JwtAuthGuard, StoreRolesGuard)
export class CartController extends BaseController<
  ShoppingCart,
  CreateCartDto,
  UpdateCartDto
> {
  constructor(private readonly cartService: CartService) {
    super(cartService);
  }
}
