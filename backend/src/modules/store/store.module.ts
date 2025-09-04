import { Module } from '@nestjs/common';
import { StoreService } from 'src/modules/store/store.service';
import { StoreController } from 'src/modules/store/store.controller';
import { StoreRepository } from 'src/modules/store/store.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Store } from 'src/entities/store.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Store])],
  controllers: [StoreController],
  providers: [StoreService, StoreRepository],
})
export class StoreModule {}
