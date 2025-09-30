import { forwardRef, Module } from '@nestjs/common';
import { LikesService } from './likes.service';
import { LikesController } from './likes.controller';
import { LikesRepository } from 'src/modules/user/likes/likes/like.repository';
import { AnalyticsModule } from 'src/modules/analytics/analytics.module';

@Module({
  imports: [forwardRef(() => AnalyticsModule)],
  controllers: [LikesController],
  providers: [LikesService, LikesRepository],
})
export class LikesModule {}
