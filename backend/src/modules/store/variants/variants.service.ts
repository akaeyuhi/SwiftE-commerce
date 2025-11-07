import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { VariantsRepository } from 'src/modules/store/variants/variants.repository';
import { BaseService } from 'src/common/abstracts/base.service';
import { ProductVariant } from 'src/entities/store/product/variant.entity';
import { CreateVariantDto } from 'src/modules/store/variants/dto/create-variant.dto';
import { UpdateVariantDto } from 'src/modules/store/variants/dto/update-variant.dto';
import { InventoryService } from 'src/modules/store/inventory/inventory.service';

/**
 * VariantsService
 *
 * High-level operations for ProductVariant management:
 *  - create/update/delete variants
 *  - SKU generation & uniqueness enforcement
 *  - attributes management (JSONB patch/replace/remove)
 *  - inventory convenience operations (delegates to InventoryService)
 *
 * This service extends BaseService so the base CRUD helpers are available,
 * but we provide richer domain operations required by the application.
 */
@Injectable()
export class VariantsService extends BaseService<
  ProductVariant,
  CreateVariantDto,
  UpdateVariantDto
> {
  // maximum attempts when generating unique SKU
  private static readonly SKU_GENERATE_ATTEMPTS = 6;

  constructor(
    private readonly inventoryService: InventoryService,
    private readonly variantRepo: VariantsRepository
  ) {
    super(variantRepo);
  }

  /**
   * Generate a candidate SKU for a product variant.
   *
   * Default strategy: PRODUCT-<short-uuid>
   * You can replace this logic if you want human-friendly SKUs.
   *
   * @param productId - id of the product (optional hint)
   */
  private generateCandidateSku(productId?: string): string {
    const short = uuidv4().split('-')[0].toUpperCase();
    const prefix = productId ? `P-${productId.slice(0, 4).toUpperCase()}` : 'V';
    return `${prefix}-${short}`;
  }

  /**
   * Ensure a SKU is unique. Throws ConflictException if already taken.
   *
   * @param sku - SKU candidate to check
   * @param excludeVariantId - optional variant id to exclude from uniqueness check (used on update)
   */
  private async ensureSkuUnique(
    sku: string,
    excludeVariantId?: string
  ): Promise<void> {
    const existing = await this.variantRepo.findOne({ where: { sku } });
    if (existing && (!excludeVariantId || existing.id !== excludeVariantId)) {
      throw new ConflictException(`SKU '${sku}' is already in use`);
    }
  }

  /**
   * Create a new ProductVariant.
   *
   * Behaviour:
   *  - If DTO contains `sku`, it will be validated for uniqueness.
   *  - If DTO does not contain `sku`, a candidate SKU will be generated and tested;
   *    generation will be retried up to SKU_GENERATE_ATTEMPTS times to avoid collisions.
   *  - Attributes (if provided) are stored as-is into the JSONB column.
   *
   * @param dto - CreateVariantDto (expects at least productId, price, sku optional)
   * @returns saved ProductVariant
   */
  async create(dto: CreateVariantDto): Promise<ProductVariant> {
    let skuToUse = dto.sku?.trim();

    if (skuToUse) {
      await this.ensureSkuUnique(skuToUse);
    } else {
      let attempt = 0;
      while (attempt < VariantsService.SKU_GENERATE_ATTEMPTS) {
        attempt += 1;
        const candidate = this.generateCandidateSku(dto.productId);
        const exists = await this.variantRepo.findOne({
          where: { sku: candidate },
        });
        if (!exists) {
          skuToUse = candidate;
          break;
        }
      }
      if (!skuToUse) {
        skuToUse = `${this.generateCandidateSku(dto.productId)}-${
          Math.random() * 9000 + 1000
        }`;
        await this.ensureSkuUnique(skuToUse);
      }
    }

    const variant = this.variantRepo.create({
      product: { id: dto.productId },
      sku: skuToUse,
      price: dto.price,
      attributes: dto.attributes ?? undefined,
    });

    const saved = await this.variantRepo.save(variant);

    if (dto.initialQuantity && dto.storeId) {
      await this.inventoryService.create({
        variantId: saved.id,
        storeId: dto.storeId,
        quantity: dto.initialQuantity,
      } as any);
    }

    return saved;
  }

  /**
   * Update a variant (fields: price, attributes, sku, etc).
   *
   * If SKU is present in DTO and differs from the current one, uniqueness is validated.
   *
   * @param id - variant id
   * @param dto - UpdateVariantDto
   * @returns updated ProductVariant
   * @throws NotFoundException if variant not found
   */
  async update(id: string, dto: UpdateVariantDto): Promise<ProductVariant> {
    const variant = await this.variantRepo.findById(id);
    if (!variant) throw new NotFoundException('Variant not found');

    if (dto.sku && dto.sku !== variant.sku) {
      await this.ensureSkuUnique(dto.sku, id);
      variant.sku = dto.sku;
    }

    if (dto.price !== undefined) variant.price = dto.price;

    if (dto.attributes) {
      variant.attributes = {
        ...(variant.attributes ?? {}),
        ...(dto.attributes ?? {}),
      };
    }

    // If explicit replacement requested, DTO can provide `replaceAttributes: true`
    if ((dto as any).replaceAttributes && dto.attributes) {
      variant.attributes = dto.attributes;
    }

    return await this.variantRepo.save(variant);
  }

  /**
   * Find variant by SKU.
   *
   * @param sku - SKU string
   * @returns ProductVariant or null
   */
  async findBySku(sku: string): Promise<ProductVariant | null> {
    const variant = await this.variantRepo.findOne({ where: { sku } });
    if (!variant)
      throw new NotFoundException(`Variant with sku ${sku} not found`);
    return variant;
  }

  /**
   * List all variants for a product.
   *
   * @param productId - product id
   * @returns ProductVariant[]
   */
  async listByProduct(productId: string): Promise<ProductVariant[]> {
    return this.variantRepo.find({
      where: { productId },
    });
  }

  /**
   * Merge/patch attributes for a variant.
   *
   * This performs a shallow merge of the provided attributes into the existing JSONB `attributes`.
   *
   * @param variantId - variant id
   * @param patch - partial attributes to merge
   * @returns updated ProductVariant
   * @throws NotFoundException if variant not found
   */
  async addAttributes(
    variantId: string,
    patch: Record<string, any>
  ): Promise<ProductVariant> {
    const v = await this.variantRepo.findOneBy({ id: variantId });
    if (!v) throw new NotFoundException('Variant not found');

    v.attributes = { ...(v.attributes ?? {}), ...(patch ?? {}) };
    return this.variantRepo.save(v);
  }

  /**
   * Replace the attribute object entirely.
   *
   * @param variantId - variant id
   * @param attributes - new attributes object (or null to clear)
   * @returns updated ProductVariant
   */
  async replaceAttributes(
    variantId: string,
    attributes: Record<string, any> | null
  ): Promise<ProductVariant> {
    const v = await this.variantRepo.findOneBy({ id: variantId });
    if (!v) throw new NotFoundException('Variant not found');

    v.attributes = attributes ?? undefined;
    return this.variantRepo.save(v);
  }

  /**
   * Remove a single attribute key from the variant's attributes object.
   *
   * @param variantId - variant id
   * @param key - attribute key to remove
   * @returns updated ProductVariant
   * @throws NotFoundException if variant not found
   */
  async removeAttribute(
    variantId: string,
    key: string
  ): Promise<ProductVariant> {
    const variant = await this.variantRepo.findOneBy({ id: variantId });
    if (!variant) throw new NotFoundException('Variant not found');

    if (!variant.attributes || !(key in variant.attributes)) {
      return variant;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { [key]: _removed, ...rest } = variant.attributes;
    variant.attributes = rest;
    return this.variantRepo.save(variant);
  }

  /**
   * update price for variant.
   *
   * @param variantId - variant id
   * @param price - new price
   * @returns updated ProductVariant
   */
  async updatePrice(variantId: string, price: number): Promise<ProductVariant> {
    const v = await this.variantRepo.findOneBy({ id: variantId });
    if (!v) throw new NotFoundException('Variant not found');
    v.price = price;
    return this.variantRepo.save(v);
  }

  async setInventory(storeId: string, variantId: string, qty: number) {
    return this.inventoryService.setInventory(storeId, variantId, qty);
  }

  /**
   * Adjust inventory by delta.
   *
   * @param variantId
   * @param delta
   */
  async adjustInventory(variantId: string, delta: number) {
    return this.inventoryService.adjustInventory(variantId, delta);
  }

  async findWithRelations(variantId: string): Promise<ProductVariant | null> {
    return await this.variantRepo.findOne({
      where: { id: variantId },
      relations: {
        product: {
          store: true,
          categories: true,
        },
      },
    });
  }

  async createMultiple(dtos: CreateVariantDto[]): Promise<ProductVariant[]> {
    const created = [] as ProductVariant[];
    for (const dto of dtos) {
      const variant = await this.create(dto);
      created.push(variant);
    }
    return created;
  }

  async updateMultiple(dtos: UpdateVariantDto[]): Promise<ProductVariant[]> {
    const updated = [] as ProductVariant[];
    for (const dto of dtos) {
      if (!dto.variantId) continue;
      const variant = await this.update(dto.variantId, dto);
      updated.push(variant);
    }
    return updated;
  }
}
