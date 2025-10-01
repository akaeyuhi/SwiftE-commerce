import { Module } from '@nestjs/common';
import { CartItemService } from 'src/modules/store/cart/cart-item/cart-item.service';
import { CartItemController } from 'src/modules/store/cart/cart-item/cart-item.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartItem } from 'src/entities/store/cart/cart-item.entity';
import { CartItemRepository } from 'src/modules/store/cart/cart-item/cart-item.repository';

@Module({
  imports: [TypeOrmModule.forFeature([CartItem])],
  providers: [CartItemService, CartItemRepository],
  controllers: [CartItemController],
  exports: [CartItemService],
})
export class CartItemModule {}
