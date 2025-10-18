import { IInventoryRepository } from 'src/common/contracts/ai-predictor.contract';
import { Injectable } from '@nestjs/common';
import { Inventory } from 'src/entities/store/product/inventory.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class AiInventoryRepository implements IInventoryRepository {
  constructor(
    @InjectRepository(Inventory)
    private readonly inventoryRepository: Repository<Inventory>
  ) {}
  async getInventoryStats(
    productId: string
  ): Promise<{ quantity: number; daysSinceRestock: number }> {
    const invRaw = await this.inventoryRepository
      .createQueryBuilder('inv')
      .select('COALESCE(SUM(inv.quantity),0)', 'inventoryQty')
      .addSelect('MAX(inv.updatedAt)::text', 'lastUpdatedAt')
      .innerJoin('inv.variant', 'v')
      .where('v.product = :productId', { productId })
      .getRawOne();

    const quantity = invRaw ? Number(invRaw.inventoryQty || 0) : 0;
    const lastRestockAt = invRaw?.lastUpdatedAt
      ? new Date(invRaw.lastUpdatedAt)
      : null;

    const daysSinceRestock = lastRestockAt
      ? Math.max(
          0,
          Math.floor(
            (Date.now() - lastRestockAt.getTime()) / (1000 * 60 * 60 * 24)
          )
        )
      : 365;

    return { quantity, daysSinceRestock };
  }
}
