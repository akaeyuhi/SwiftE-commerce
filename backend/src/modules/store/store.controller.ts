import { Controller, UseGuards, UseInterceptors } from '@nestjs/common';
import { StoreService } from 'src/modules/store/store.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { BaseController } from 'src/common/abstracts/base.controller';
import { Store } from 'src/entities/store/store.entity';
import { StoreDto } from 'src/modules/store/dto/store.dto';
import { JwtAuthGuard } from 'src/modules/auth/policy/guards/jwt-auth.guard';
import { StoreRolesGuard } from 'src/modules/auth/policy/guards/store-roles.guard';
import { RecordEventInterceptor } from 'src/modules/analytics/interceptors/record-event.interceptor';
import { RecordEvents } from 'src/common/decorators/record-event.decorator';
import { AnalyticsEventType } from 'src/modules/analytics/entities/analytics-event.entity';

@Controller('stores')
@UseGuards(JwtAuthGuard, StoreRolesGuard)
@UseInterceptors(RecordEventInterceptor)
@RecordEvents({
  findOne: {
    eventType: AnalyticsEventType.VIEW,
    storeId: 'params.storeId',
    userId: 'user.id',
    invokedOn: 'store',
    when: 'after',
  },
})
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
