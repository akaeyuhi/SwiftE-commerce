import { Inject, Injectable } from '@nestjs/common';
import {
  IInventoryRepository,
  IInventoryService,
} from 'src/common/contracts/ai-predictor.contract';

@Injectable()
export class AiInventoryService implements IInventoryService {
  constructor(
    @Inject(IInventoryRepository)
    private readonly inventoryRepository: IInventoryRepository
  ) {}

  getInventoryStats(
    productId: string
  ): Promise<{ quantity: number; daysSinceRestock: number }> {
    return this.inventoryRepository.getInventoryStats(productId);
  }
}
