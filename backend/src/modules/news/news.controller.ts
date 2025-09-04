import { Controller, UseGuards } from '@nestjs/common';
import { NewsService } from './news.service';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';
import { BaseController } from 'src/common/abstracts/base.controller';
import { NewsPost } from 'src/entities/news-post.entity';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { StoreRolesGuard } from 'src/common/guards/store-roles.guard';

@Controller('news')
@UseGuards(JwtAuthGuard, StoreRolesGuard)
export class NewsController extends BaseController<
  NewsPost,
  CreateNewsDto,
  UpdateNewsDto
> {
  constructor(private readonly newsService: NewsService) {
    super(newsService);
  }
}
