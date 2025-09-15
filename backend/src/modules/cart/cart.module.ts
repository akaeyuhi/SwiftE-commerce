import { Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShoppingCart } from 'src/entities/cart.entity';
import { CartItemModule } from './cart-item/cart-item.module';

@Module({
  imports: [TypeOrmModule.forFeature([ShoppingCart]), CartItemModule],
  controllers: [CartController],
  providers: [CartService],
})
export class CartModule {}
