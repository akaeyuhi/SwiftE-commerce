export interface Category {
  id: string;
  storeId: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  level: number;
  path: string;
  productCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  children?: Category[];
  parent?: Category;
}

export interface CreateCategoryRequest {
  name: string;
  description?: string;
  parentId?: string;
  isActive?: boolean;
}

export interface UpdateCategoryRequest {
  name?: string;
  description?: string;
  parentId?: string;
  isActive?: boolean;
}

export interface CategoryTree {
  id: string;
  name: string;
  slug: string;
  level: number;
  productCount: number;
  children: CategoryTree[];
}
