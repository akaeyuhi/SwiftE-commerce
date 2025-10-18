import { PartialType } from '@nestjs/mapped-types';
import { CreateNewsDto } from 'src/modules/store/news/dto/create-news.dto';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateNewsDto extends PartialType(CreateNewsDto) {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(10000)
  content?: string;
}
