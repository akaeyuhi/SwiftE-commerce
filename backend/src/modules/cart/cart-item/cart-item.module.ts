import { Module } from '@nestjs/common';
import { CartItemService } from './cart-item.service';
import { CartItemController } from './cart-item.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartItem } from 'src/entities/cart-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CartItem])],
  providers: [CartItemService],
  controllers: [CartItemController],
})
export class CartItemModule {}
