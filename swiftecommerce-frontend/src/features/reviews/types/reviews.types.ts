export interface Review {
  id: string;
  productId: string;
  userId: string;
  storeId: string;
  rating: number;
  title?: string;
  comment: string;
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
  };
}

export interface CreateReviewRequest {
  rating: number;
  title?: string;
  comment: string;
}

export interface UpdateReviewRequest {
  rating?: number;
  title?: string;
  comment?: string;
}

export interface ReviewFilters {
  rating?: number;
  minRating?: number;
  maxRating?: number;
  verifiedOnly?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: 'rating' | 'helpful' | 'recent';
}
