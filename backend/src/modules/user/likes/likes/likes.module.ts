import { Module } from '@nestjs/common';
import { LikesService } from './likes.service';
import { LikesController } from './likes.controller';
import { LikesRepository } from 'src/modules/user/likes/likes/likes.repository';
import { AnalyticsModule } from 'src/modules/analytics/analytics.module';

@Module({
  imports: [AnalyticsModule],
  controllers: [LikesController],
  providers: [LikesService, LikesRepository],
})
export class LikesModule {}
