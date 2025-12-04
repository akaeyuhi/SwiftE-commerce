import { Global, Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { EventsController } from 'src/modules/analytics/controllers/events.controller';
import { AnalyticsController } from 'src/modules/analytics/controllers/analytics.controller';
import { ScheduleModule } from '@nestjs/schedule';
import { AdminStatsController } from 'src/modules/analytics/controllers/admin-stats.controller';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { RabbitMQModule } from 'src/modules/infrastructure/rabbitmq/rabbitmq.module';

@Global()
@Module({
  imports: [ScheduleModule.forRoot(), ConfigModule, HttpModule, RabbitMQModule],
  providers: [AnalyticsService],
  controllers: [AdminStatsController, EventsController, AnalyticsController],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
