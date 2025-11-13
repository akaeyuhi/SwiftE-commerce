import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IStoreService } from 'src/common/contracts/admin.contract';
import { Injectable } from '@nestjs/common';
import { Store } from 'src/entities/store/store.entity';

@Injectable()
export class AdminStoreService implements IStoreService {
  constructor(
    @InjectRepository(Store) private readonly storeRepository: Repository<Store>
  ) {}

  async count(searchParams?: any) {
    return this.storeRepository.count(searchParams);
  }
}
