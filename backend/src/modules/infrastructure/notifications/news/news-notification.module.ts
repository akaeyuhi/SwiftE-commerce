import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NewsNotificationLog } from 'src/entities/infrastructure/notifications/news-notification-log.entity';
import { NewsNotificationService } from 'src/modules/infrastructure/notifications/news/news-notification.service';

@Module({
  imports: [TypeOrmModule.forFeature([NewsNotificationLog])],
  providers: [NewsNotificationService],
  exports: [NewsNotificationService],
})
export class NewsNotificationModule {}
