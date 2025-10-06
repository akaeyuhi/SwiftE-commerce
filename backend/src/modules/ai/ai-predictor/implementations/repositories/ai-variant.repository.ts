import { Injectable } from '@nestjs/common';
import { IVariantRepository } from 'src/common/contracts/ai-predictor.contract';
import { Repository } from 'typeorm';
import { ProductVariant } from 'src/entities/store/product/variant.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class AiVariantRepository implements IVariantRepository {
  constructor(
    @InjectRepository(ProductVariant)
    private readonly variantRepository: Repository<ProductVariant>
  ) {}

  async getPriceStats(
    productId: string
  ): Promise<{ min: number; max: number; avg: number }> {
    const priceRaw = await this.variantRepository
      .createQueryBuilder('v')
      .select('AVG(v.price)::numeric', 'avgPrice')
      .addSelect('MIN(v.price)::numeric', 'minPrice')
      .addSelect('MAX(v.price)::numeric', 'maxPrice')
      .where('v.product = :productId', { productId })
      .getRawOne();

    const avg = priceRaw?.avgPrice ? Number(priceRaw.avgPrice) : 0;
    const min = priceRaw?.minPrice ? Number(priceRaw.minPrice) : avg;
    const max = priceRaw?.maxPrice ? Number(priceRaw.maxPrice) : avg;

    return { avg, min, max };
  }
}
