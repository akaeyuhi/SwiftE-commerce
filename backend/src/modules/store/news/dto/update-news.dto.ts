import { PartialType } from '@nestjs/mapped-types';
import { CreateNewsDto } from 'src/modules/store/news/dto/create-news.dto';

export class UpdateNewsDto extends PartialType(CreateNewsDto) {}
