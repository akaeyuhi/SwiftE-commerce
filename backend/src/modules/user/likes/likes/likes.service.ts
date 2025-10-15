import {BadRequestException, Injectable, NotFoundException} from '@nestjs/common';
import { BaseService } from 'src/common/abstracts/base.service';
import { CreateLikeDto } from './dto/create-like.dto';
import { Like } from 'src/entities/user/like.entity';
import { LikesRepository } from 'src/modules/user/likes/likes/likes.repository';
import { LikeDto } from 'src/modules/user/likes/likes/dto/like.dto';

@Injectable()
export class LikesService extends BaseService<
  Like,
  CreateLikeDto,
  CreateLikeDto,
  LikeDto
> {
  constructor(private readonly likesRepo: LikesRepository) {
    super(likesRepo);
  }

  /**
   * Create a like for user and product OR store.
   * Ensures exactly one of productId/storeId is provided and prevents duplicates.
   */
  async create(dto: CreateLikeDto): Promise<Like> {
    const { userId, productId, storeId } = dto;
    if (!productId && !storeId) {
      throw new BadRequestException('productId or storeId must be provided');
    }
    if (productId && storeId) {
      throw new BadRequestException('Provide only one of productId or storeId');
    }

    if (productId) {
      const exists = await this.likesRepo.findByUserAndProduct(
        userId!,
        productId
      );
      if (exists)
        throw new BadRequestException(
          `You've liked product ${productId} already`
        );
      return this.likesRepo.createEntity({
        userId,
        productId,
      });
    } else {
      const exists = await this.likesRepo.findByUserAndStore(userId!, storeId!);
      if (exists)
        throw new BadRequestException(`You've liked store ${storeId} already`);
      return this.likesRepo.createEntity({
        userId,
        storeId,
      });
    }
  }

  async removeById(id: string): Promise<void> {
    const exists = await this.likesRepo.findById(id);
    if (!exists)
      throw new NotFoundException(`Like with id ${id} does not exist`);
    await this.likesRepo.remove(exists);
  }

  async listForUser(userId: string) {
    return this.likesRepo.listByUser(userId);
  }
}
