import { Injectable } from '@nestjs/common';
import { BaseService } from 'src/common/abstracts/base.service';
import { ShoppingCart } from 'src/entities/cart.entity';
import { CreateCartDto } from 'src/modules/cart/dto/create-cart.dto';
import { UpdateCartDto } from 'src/modules/cart/dto/update-cart.dto';
import { CartRepository } from 'src/modules/cart/cart.repository';

@Injectable()
export class CartService extends BaseService<
  ShoppingCart,
  CreateCartDto,
  UpdateCartDto
> {
  constructor(private readonly cartRepo: CartRepository) {
    super(cartRepo);
  }
}
