import { Module } from '@nestjs/common';
import { NewsService } from 'src/modules/store/modules/news/news.service';
import { NewsController } from 'src/modules/store/modules/news/news.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NewsPost } from 'src/entities/news-post.entity';

@Module({
  imports: [TypeOrmModule.forFeature([NewsPost])],
  controllers: [NewsController],
  providers: [NewsService],
})
export class NewsModule {}
