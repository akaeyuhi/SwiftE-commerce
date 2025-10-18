import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/entities/user/user.entity';
import { IUserRepository } from 'src/common/contracts/policy.contract';

/**
 * GuardUserRepository
 *
 * Minimal repository for authorization checks ONLY.
 * Does NOT extend BaseRepository - only contains queries needed by guards.
 *
 * Why not extend BaseRepository?
 * - Guards don't need full CRUD operations
 * - Keeps authorization layer lightweight
 * - Prevents accidental business logic in guards
 */
@Injectable()
export class GuardUserRepository implements IUserRepository {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>
  ) {}

  async findOneWithRelations(id: string): Promise<User | null> {
    if (!id) return null;
    return this.userRepo.findOne({
      where: { id },
      relations: ['roles', 'carts', 'orders', 'aiLogs'],
    });
  }
}
