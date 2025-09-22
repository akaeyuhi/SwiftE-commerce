import { Module } from '@nestjs/common';
import { CartService } from 'src/modules/store/modules/cart/cart.service';
import { CartController } from 'src/modules/store/modules/cart/cart.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShoppingCart } from 'src/entities/store/cart/cart.entity';
import { CartItemModule } from 'src/modules/store/modules/cart/modules/cart-item/cart-item.module';
import { CartRepository } from 'src/modules/store/modules/cart/cart.repository';

@Module({
  imports: [TypeOrmModule.forFeature([ShoppingCart]), CartItemModule],
  controllers: [CartController],
  providers: [CartService, CartRepository],
})
export class CartModule {}
