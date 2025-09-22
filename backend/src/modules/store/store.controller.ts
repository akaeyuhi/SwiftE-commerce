import { Controller, UseGuards } from '@nestjs/common';
import { StoreService } from 'src/modules/store/store.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { BaseController } from 'src/common/abstracts/base.controller';
import { Store } from 'src/entities/store/store.entity';
import { StoreDto } from 'src/modules/store/dto/store.dto';
import { JwtAuthGuard } from 'src/modules/auth/policy/guards/jwt-auth.guard';
import { StoreRolesGuard } from 'src/modules/auth/policy/guards/store-roles.guard';

@Controller('stores')
@UseGuards(JwtAuthGuard, StoreRolesGuard)
export class StoreController extends BaseController<
  Store,
  CreateStoreDto,
  UpdateStoreDto,
  StoreDto
> {
  constructor(private readonly storeService: StoreService) {
    super(storeService);
  }
}
