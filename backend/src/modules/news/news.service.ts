import { Injectable } from '@nestjs/common';
import { BaseService } from 'src/common/abstracts/base.service';
import { NewsPost } from 'src/entities/news-post.entity';
import { CreateNewsDto } from 'src/modules/news/dto/create-news.dto';
import { UpdateNewsDto } from 'src/modules/news/dto/update-news.dto';
import { NewsRepository } from 'src/modules/news/news.repository';

@Injectable()
export class NewsService extends BaseService<
  NewsPost,
  CreateNewsDto,
  UpdateNewsDto
> {
  constructor(private readonly newsRepo: NewsRepository) {
    super(newsRepo);
  }
}
