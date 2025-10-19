export interface NewsArticle {
  id: string;
  storeId: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  coverImage?: string;
  isPublished: boolean;
  publishedAt?: string;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  author?: {
    id: string;
    name: string;
  };
}

export interface CreateNewsRequest {
  title: string;
  content: string;
  excerpt?: string;
  coverImage?: string;
  isPublished?: boolean;
}

export interface UpdateNewsRequest {
  title?: string;
  content?: string;
  excerpt?: string;
  coverImage?: string;
  isPublished?: boolean;
}

export interface NewsFilters {
  isPublished?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: 'recent' | 'popular' | 'title';
}
