import { Module } from '@nestjs/common';
import { NewsService } from './news.service';
import { NewsController } from './news.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NewsPost } from 'src/entities/news-post.entity';

@Module({
  imports: [TypeOrmModule.forFeature([NewsPost])],
  controllers: [NewsController],
  providers: [NewsService],
})
export class NewsModule {}
