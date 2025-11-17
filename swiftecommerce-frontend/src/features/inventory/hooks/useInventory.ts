import { useProducts } from '@/features/products/hooks/useProducts';
import { useMemo } from 'react';

export interface InventoryItem {
  id: string;
  productId: string;
  productName: string;
  variantId: string;
  sku: string;
  quantity: number;
  price: number;
  updatedAt?: string;
}

export function useInventory(storeId: string) {
  const { data: productsData, ...rest } = useProducts(storeId);

  const inventoryItems = useMemo(() => {
    if (!productsData) return [];
    return productsData.data.flatMap((product) =>
      product.variants.map((variant) => ({
        id: variant.inventory.id,
        productId: product.id,
        productName: product.name,
        variantId: variant.id,
        sku: variant.sku,
        quantity: variant.inventory.quantity,
        price: variant.price,
        updatedAt: variant.inventory.updatedAt?.toString(),
      }))
    );
  }, [productsData]);

  return { inventoryItems, ...rest };
}
