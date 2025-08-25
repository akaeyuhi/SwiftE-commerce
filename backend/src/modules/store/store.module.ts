import { Module } from '@nestjs/common';
import { StoreService } from 'src/modules/store/store.service';
import { StoreController } from 'src/modules/store/store.controller';
import { StoreRepository } from 'src/modules/store/store.repository';

@Module({
  controllers: [StoreController],
  providers: [StoreService, StoreRepository],
})
export class StoreModule {}
