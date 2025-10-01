import { Module } from '@nestjs/common';
import { NewsService } from 'src/modules/store/news/news.service';
import { NewsController } from 'src/modules/store/news/news.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NewsPost } from 'src/entities/store/news-post.entity';
import { NewsRepository } from 'src/modules/store/news/news.repository';

@Module({
  imports: [TypeOrmModule.forFeature([NewsPost])],
  controllers: [NewsController],
  providers: [NewsService, NewsRepository],
})
export class NewsModule {}
