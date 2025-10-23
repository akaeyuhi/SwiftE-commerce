import { Store } from '@/features/stores/types/store.types.ts';
import { User } from '@/features/users/types/users.types.ts';

export interface NewsPost {
  id: string;
  store: Store;
  storeId: string;
  author: User;
  authorId: string;
  title: string;
  content: string;
  isPublished: boolean;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateNewsDto {
  title: string;
  content: string;
  isPublished?: boolean;
}

export interface UpdateNewsDto {
  title?: string;
  content?: string;
  isPublished?: boolean;
}
