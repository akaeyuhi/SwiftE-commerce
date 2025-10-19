export interface Like {
  id: string;
  userId: string;
  productId?: string;
  storeId?: string;
  type: 'product' | 'store';
  createdAt: string;
}

export interface UserLikes {
  products: Array<{
    id: string;
    likeId: string;
    product: {
      id: string;
      name: string;
      price: number;
      image?: string;
    };
  }>;
  stores: Array<{
    id: string;
    likeId: string;
    store: {
      id: string;
      name: string;
      description?: string;
    };
  }>;
}
