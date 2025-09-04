import { Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShoppingCart } from 'src/entities/cart.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ShoppingCart])],
  controllers: [CartController],
  providers: [CartService],
})
export class CartModule {}
