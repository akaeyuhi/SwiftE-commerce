export const IVariantRepository = Symbol('MINIMAL_VARIANT_REPOSITORY');
export const IInventoryRepository = Symbol('MINIMAL_INVENTORY_REPOSITORY');

export const IVariantService = Symbol('MINIMAL_VARIANT_SERVICE');
export const IInventoryService = Symbol('MINIMAL_INVENTORY_SERVICE');

export interface IVariantRepository {
  getPriceStats(productId: string): Promise<{
    min: number;
    max: number;
    avg: number;
  }>;
}

export interface IInventoryRepository {
  getInventoryStats(productId: string): Promise<{
    quantity: number;
    daysSinceRestock: number;
  }>;
}

export interface IVariantService {
  getPriceStats(productId: string): Promise<{
    min: number;
    max: number;
    avg: number;
  }>;
}

export interface IInventoryService {
  getInventoryStats(productId: string): Promise<{
    quantity: number;
    daysSinceRestock: number;
  }>;
}
