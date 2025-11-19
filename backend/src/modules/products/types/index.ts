export interface ProductSearchOptions {
  sortBy?: 'relevance' | 'views' | 'sales' | 'rating' | 'price' | 'recent';
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  categoryId?: string;
  query?: string;
  limit?: number;
  offset?: number;
}

export interface AdvancedSearchOptions {
  storeId?: string;
  query?: string;
  categoryIds?: string[];
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  maxRating?: number;
  inStock?: boolean;
  sortBy?: 'name' | 'price' | 'rating' | 'views' | 'sales' | 'recent';
  sortOrder?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
}
