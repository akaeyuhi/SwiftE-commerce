import { Module } from '@nestjs/common';
import { CartItemService } from 'src/modules/store/modules/cart/modules/cart-item/cart-item.service';
import { CartItemController } from 'src/modules/store/modules/cart/modules/cart-item/cart-item.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartItem } from 'src/entities/store/cart/cart-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CartItem])],
  providers: [CartItemService],
  controllers: [CartItemController],
})
export class CartItemModule {}
