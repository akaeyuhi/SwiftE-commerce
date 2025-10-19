import { BaseService } from '@/lib/api/BaseService';
import { API_ENDPOINTS, buildUrl } from '@/config/api.config';
import {
  ProductVariant,
  CreateVariantRequest,
  UpdateVariantRequest,
  SetInventoryRequest,
  AdjustInventoryRequest,
  UpdatePriceRequest,
  AddAttributesRequest,
} from '../types/variant.types';

export class VariantsService extends BaseService {
  /**
   * Get all variants for a product
   */
  async getVariants(
    storeId: string,
    productId: string
  ): Promise<ProductVariant[]> {
    const url = buildUrl(API_ENDPOINTS.VARIANTS.LIST, { storeId, productId });
    return this.client.get<ProductVariant[]>(url);
  }

  /**
   * Get single variant
   */
  async getVariant(
    storeId: string,
    productId: string,
    variantId: string
  ): Promise<ProductVariant> {
    const url = buildUrl(API_ENDPOINTS.VARIANTS.FIND_ONE, {
      storeId,
      productId,
      id: variantId,
    });
    return this.client.get<ProductVariant>(url);
  }

  /**
   * Get variant by SKU
   */
  async getVariantBySku(
    storeId: string,
    productId: string,
    sku: string
  ): Promise<ProductVariant> {
    const url = buildUrl(API_ENDPOINTS.VARIANTS.FIND_BY_SKU, {
      storeId,
      productId,
      sku,
    });
    return this.client.get<ProductVariant>(url);
  }

  /**
   * Create variant
   */
  async createVariant(
    storeId: string,
    productId: string,
    data: CreateVariantRequest
  ): Promise<ProductVariant> {
    const url = buildUrl(API_ENDPOINTS.VARIANTS.CREATE, { storeId, productId });
    return this.client.post<ProductVariant>(url, data);
  }

  /**
   * Update variant
   */
  async updateVariant(
    storeId: string,
    productId: string,
    variantId: string,
    data: UpdateVariantRequest
  ): Promise<ProductVariant> {
    const url = buildUrl(API_ENDPOINTS.VARIANTS.UPDATE, {
      storeId,
      productId,
      id: variantId,
    });
    return this.client.patch<ProductVariant>(url, data);
  }

  /**
   * Delete variant
   */
  async deleteVariant(
    storeId: string,
    productId: string,
    variantId: string
  ): Promise<void> {
    const url = buildUrl(API_ENDPOINTS.VARIANTS.DELETE, {
      storeId,
      productId,
      id: variantId,
    });
    return this.client.delete<void>(url);
  }

  /**
   * Set inventory (absolute value)
   */
  async setInventory(
    storeId: string,
    productId: string,
    variantId: string,
    data: SetInventoryRequest
  ): Promise<ProductVariant> {
    const url = buildUrl(API_ENDPOINTS.VARIANTS.SET_INVENTORY, {
      storeId,
      productId,
      id: variantId,
    });
    return this.client.put<ProductVariant>(url, data);
  }

  /**
   * Adjust inventory (relative change)
   */
  async adjustInventory(
    storeId: string,
    productId: string,
    variantId: string,
    data: AdjustInventoryRequest
  ): Promise<ProductVariant> {
    const url = buildUrl(API_ENDPOINTS.VARIANTS.ADJUST_INVENTORY, {
      storeId,
      productId,
      id: variantId,
    });
    return this.client.patch<ProductVariant>(url, data);
  }

  /**
   * Update price
   */
  async updatePrice(
    storeId: string,
    productId: string,
    variantId: string,
    data: UpdatePriceRequest
  ): Promise<ProductVariant> {
    const url = buildUrl(API_ENDPOINTS.VARIANTS.UPDATE_PRICE, {
      storeId,
      productId,
      id: variantId,
    });
    return this.client.patch<ProductVariant>(url, data);
  }

  /**
   * Add attributes to variant
   */
  async addAttributes(
    storeId: string,
    productId: string,
    variantId: string,
    data: AddAttributesRequest
  ): Promise<ProductVariant> {
    const url = buildUrl(API_ENDPOINTS.VARIANTS.ADD_ATTRIBUTES, {
      storeId,
      productId,
      id: variantId,
    });
    return this.client.post<ProductVariant>(url, data);
  }

  /**
   * Remove attribute from variant
   */
  async removeAttribute(
    storeId: string,
    productId: string,
    variantId: string,
    attributeKey: string
  ): Promise<ProductVariant> {
    const url = buildUrl(API_ENDPOINTS.VARIANTS.REMOVE_ATTRIBUTE, {
      storeId,
      productId,
      id: variantId,
      key: attributeKey,
    });
    return this.client.delete<ProductVariant>(url);
  }
}

export const variantsService = new VariantsService();
