import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Store } from 'src/entities/store/store.entity';
import { IStoreRepository } from 'src/common/contracts/policy.contract';

@Injectable()
export class GuardStoreRepository implements IStoreRepository {
  constructor(
    @InjectRepository(Store)
    private readonly storeRepo: Repository<Store>
  ) {}

  async findById(id: string): Promise<Store | null> {
    return this.storeRepo.findOneBy({ id } as any);
  }
}
