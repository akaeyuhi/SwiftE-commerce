import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from 'src/common/abstracts/base.repository';
import { ShoppingCart } from 'src/entities/cart.entity';

@Injectable()
export class CartRepository extends BaseRepository<ShoppingCart> {
  constructor(dataSource: DataSource) {
    super(ShoppingCart, dataSource.createEntityManager());
  }
}
