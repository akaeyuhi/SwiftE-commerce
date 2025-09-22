import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from 'src/common/abstracts/base.repository';
import { NewsPost } from 'src/entities/store/news-post.entity';

@Injectable()
export class NewsRepository extends BaseRepository<NewsPost> {
  constructor(dataSource: DataSource) {
    super(NewsPost, dataSource.createEntityManager());
  }
}
