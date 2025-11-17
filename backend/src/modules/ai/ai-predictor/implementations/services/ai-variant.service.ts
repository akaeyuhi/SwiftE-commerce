import { Inject, Injectable } from '@nestjs/common';
import {
  IVariantRepository,
  IVariantService,
} from 'src/common/contracts/ai-predictor.contract';

@Injectable()
export class AiVariantService implements IVariantService {
  constructor(
    @Inject(IVariantRepository)
    private readonly variantRepository: IVariantRepository
  ) {}

  getPriceStats(
    productId: string
  ): Promise<{ min: number; max: number; avg: number }> {
    return this.variantRepository.getPriceStats(productId);
  }
}
