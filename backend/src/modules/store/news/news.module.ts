import { Module } from '@nestjs/common';
import { NewsService } from 'src/modules/store/news/news.service';
import { NewsController } from 'src/modules/store/news/news.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NewsPost } from 'src/entities/store/news-post.entity';
import { NewsRepository } from 'src/modules/store/news/news.repository';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { StoreFollower } from 'src/entities/store/store-follower.entity';
import { NewsNotificationsListener } from 'src/modules/store/news/listeners/news-notifications.listener';
import { StoreRoleModule } from 'src/modules/store/store-role/store-role.module';
import { NewsFileService } from 'src/modules/store/news/news-file.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([NewsPost, StoreFollower]),
    EventEmitterModule.forRoot(),
    StoreRoleModule,
  ],
  controllers: [NewsController],
  providers: [
    NewsService,
    NewsRepository,
    NewsNotificationsListener,
    NewsFileService,
  ],
})
export class NewsModule {}
