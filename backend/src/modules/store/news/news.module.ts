import { Module } from '@nestjs/common';
import { NewsService } from 'src/modules/store/news/news.service';
import { NewsController } from 'src/modules/store/news/news.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NewsPost } from 'src/entities/store/news-post.entity';
import { NewsRepository } from 'src/modules/store/news/news.repository';
import { AuthModule } from 'src/modules/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([NewsPost]), AuthModule],
  controllers: [NewsController],
  providers: [NewsService, NewsRepository],
})
export class NewsModule {}
