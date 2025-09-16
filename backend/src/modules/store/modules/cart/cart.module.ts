import { Module } from '@nestjs/common';
import { CartService } from 'src/modules/store/modules/cart/cart.service';
import { CartController } from 'src/modules/store/modules/cart/cart.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShoppingCart } from 'src/entities/cart.entity';
import { CartItemModule } from 'src/modules/store/modules/cart/modules/cart-item/cart-item.module';

@Module({
  imports: [TypeOrmModule.forFeature([ShoppingCart]), CartItemModule],
  controllers: [CartController],
  providers: [CartService],
})
export class CartModule {}
