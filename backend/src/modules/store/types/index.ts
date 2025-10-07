export interface StoreSearchOptions {
  query?: string;
  minRevenue?: number;
  maxRevenue?: number;
  minProducts?: number;
  maxProducts?: number;
  minFollowers?: number;
  maxFollowers?: number;
  sortBy?: 'name' | 'revenue' | 'followers' | 'products' | 'recent';
  sortOrder?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
}

export interface StoreSearchByNameOptions {
  sortBy?: 'relevance' | 'followers' | 'revenue' | 'products' | 'recent';
  minFollowers?: number;
  minProducts?: number;
}
