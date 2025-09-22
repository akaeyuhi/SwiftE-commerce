import { forwardRef, Module } from '@nestjs/common';
import { CartService } from 'src/modules/store/cart/cart.service';
import { CartController } from 'src/modules/store/cart/cart.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShoppingCart } from 'src/entities/store/cart/cart.entity';
import { CartItemModule } from 'src/modules/store/cart/cart-item/cart-item.module';
import { CartRepository } from 'src/modules/store/cart/cart.repository';
import { PolicyModule } from 'src/modules/auth/policy/policy.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ShoppingCart]),
    CartItemModule,
    forwardRef(() => PolicyModule),
  ],
  controllers: [CartController],
  providers: [CartService, CartRepository],
})
export class CartModule {}
