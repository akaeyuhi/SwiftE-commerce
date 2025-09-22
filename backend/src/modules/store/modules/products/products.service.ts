import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from 'src/modules/store/modules/products/dto/create-product.dto';
import { UpdateProductDto } from 'src/modules/store/modules/products/dto/update-product.dto';
import { BaseService } from 'src/common/abstracts/base.service';
import { Product } from 'src/entities/store/product.entity';
import { StoreService } from 'src/modules/store/store.service';
import { ProductRepository } from 'src/modules/store/modules/products/products.repository';
import { ProductPhotoService } from 'src/modules/store/modules/products/modules/product-photo/product-photo.service';
import { CategoriesService } from 'src/modules/store/modules/categories/categories.service';
import { VariantsService } from 'src/modules/store/modules/products/modules/variants/variants.service';
import { ProductPhoto } from 'src/entities/store/product-photo.entity';

/**
 * ProductsService
 *
 * Coordinates product CRUD, variant creation and photo handling.
 *
 * Responsibilities:
 *  - Product creation / update / read operations (via ProductRepository)
 *  - Delegates photo filesystem + DB creation/deletion to ProductPhotoService.
 *  - Provides convenience methods to add/remove photos for existing products.
 *
 * Important notes:
 *  - File-system operations (save/delete) live in ProductPhotoService. ProductService
 *    orchestrates calls and ensures product existence before attaching photos.
 *  - Product creation with photos is not transactional across FS and DB by default:
 *    if a file write succeeds but DB save fails later, files may remain on disk.
 *    If you require atomic behavior, wrap calls in a QueryRunner transaction and
 *    implement cleanup of created files on rollback.
 */
@Injectable()
export class ProductsService extends BaseService<
  Product,
  CreateProductDto,
  UpdateProductDto
> {
  constructor(
    private readonly productRepo: ProductRepository,
    private readonly categoriesService: CategoriesService,
    private readonly variantsService: VariantsService,
    private readonly photoService: ProductPhotoService,
    private readonly storeService: StoreService
  ) {
    super(productRepo);
  }

  /**
   * Load a product with its relations (photos, variants, category, etc).
   *
   * This is a thin wrapper around repository helper `findWithRelations`.
   *
   * @param id - product id (UUID)
   * @returns Product with relations or null if not found
   */
  async findProductWithRelations(id: string): Promise<Product | null> {
    return this.productRepo.findWithRelations(id);
  }

  /**
   * Find all products for a store.
   *
   * Thin wrapper for repository helper `findAllByStore`.
   *
   * @param id - store id
   * @returns array of Product
   */
  async findAllByStore(id: string): Promise<Product[]> {
    return this.productRepo.findAllByStore(id);
  }

  /**
   * Create a product and optionally attach uploaded photos.
   *
   * Behavior & flow:
   *  1. Validates that the store exists (throws NotFoundException otherwise).
   *  2. Creates and persists a Product row via ProductRepository.
   *  3. If `photos` are provided:
   *     - The first available photo is treated as the main photo (the code attempts
   *       to mark one photo as `isMain` via addMainPhoto).
   *     - All provided photos are passed to `addPhotos` which delegates to
   *       ProductPhotoService to move files to the final directory and create DB rows.
   *
   * Notes / caveats:
   *  - `photos` and `mainPhoto` are `Express.Multer.File` objects provided by the
   *    controller interceptor. The ProductPhotoService expects that shape (or a compatible wrapper).
   *  - The method will return the saved product entity. If you expect `product.photos`
   *    to be populated immediately, call `findProductWithRelations(savedProduct.id)` afterward
   *    because the in-memory `savedProduct` instance may not have relations loaded.
   *  - File I/O and DB writes are not atomic here. If a later photo save fails,
   *    earlier saved photos/files may remain; consider adding cleanup or using a transaction
   *    in future if atomicity is required.
   *
   * @param dto - CreateProductDto (must include `storeId`)
   * @param photos - optional array of uploaded files (Express.Multer.File[]) to attach
   * @param mainPhoto - optional single uploaded file to be used as main photo
   * @returns created Product entity (may not include photos relation until refetched)
   * @throws NotFoundException when specified store does not exist
   */
  async create(
    dto: CreateProductDto,
    photos?: Express.Multer.File[],
    mainPhoto?: Express.Multer.File
  ): Promise<Product> {
    const store = await this.storeService.getEntityById(dto.storeId);
    if (!store) throw new NotFoundException('Store not found');

    const product = await this.productRepo.createEntity({
      name: dto.name,
      description: dto.description,
      store,
    });

    if (dto.categoryIds && dto.categoryIds.length > 1) {
      await this.attachMultipleCategories(product.id, dto.categoryIds);
    } else if (dto.categoryIds?.length === 1 || dto.categoryId) {
      await this.attachCategoryToProduct(
        product.id,
        dto.categoryIds?.pop() ?? dto.categoryId!
      );
    }
    if (photos && photos.length > 0) {
      const savePhotos = [...photos];
      const firstPhoto = savePhotos.shift()! ?? mainPhoto;
      await this.addMainPhoto(product.id, store.id, firstPhoto);
      await this.addPhotos(product.id, store.id, photos);
    }

    return product;
  }

  /**
   * Add multiple uploaded photos to an existing product.
   *
   * This method:
   *  - Validates the product exists (throws NotFoundException otherwise).
   *  - Delegates to ProductPhotoService to move files into final per-store folder
   *    and create ProductPhoto DB rows.
   *
   * Behavioral notes:
   *  - Returns `product.photos` (the in-memory product instance's relation). In many
   *    setups this will be stale immediately after insertion — to reliably get the
   *    updated list include a refetch: `await findProductWithRelations(productId)`.
   *  - If you need atomic behavior across many file writes and DB writes, wrap calls
   *    in a transaction and handle file cleanup on failure.
   *
   * @param productId - id of the product to attach photos to
   * @param storeId - id of the store that owns the product (used for filesystem path)
   * @param photos - array of uploaded files to attach
   * @returns ProductPhoto[] | null — the method returns `null` when no photos array passed,
   *          otherwise returns the product's photos relation (may require refetch to be current)
   * @throws NotFoundException when product not found
   */
  async addPhotos(
    productId: string,
    storeId: string,
    photos?: Express.Multer.File[]
  ): Promise<ProductPhoto[] | null> {
    if (!photos || photos.length === 0) return null;

    const product = await this.productRepo.findOneBy({ id: productId });
    if (!product) throw new NotFoundException('Product not found');

    const store = await this.storeService.getEntityById(storeId);
    if (!store) throw new NotFoundException('Store not found');

    return await this.photoService.addPhotos(product, store, photos);
  }

  /**
   * Add a single photo and mark it as the main photo for a product.
   *
   * Convenience wrapper that validates product existence and delegates to
   * ProductPhotoService.addPhotos with `isMain = true`.
   *
   * Behaviour:
   *  - Unsets previous `isMain` photo(s) for the product (handled inside the photo service),
   *  - Saves the new file and persists a ProductPhoto record with `isMain: true`.
   *
   * @param productId - id of the product
   * @param storeId - id of the store (used for a filesystem path)
   * @param photo - uploaded file to use as main photo
   * @returns the created ProductPhoto entity (or whatever photoService returns)
   * @throws NotFoundException when product is not found
   */
  async addMainPhoto(
    productId: string,
    storeId: string,
    photo: Express.Multer.File
  ) {
    const product = await this.productRepo.findOneBy({ id: productId });
    if (!product) throw new NotFoundException('Product not found');

    const store = await this.storeService.getEntityById(storeId);
    if (!store) throw new NotFoundException('Store not found');

    return this.photoService.addPhotos(product, store, [photo], true);
  }

  /**
   * Remove a photo by id (DB + filesystem).
   *
   * Delegates to ProductPhotoService.deletePhotoAndFile which loads the photo,
   * deletes the DB row and attempts to delete the file on disk (best-effort).
   *
   * @param photoId - id of the ProductPhoto row to delete
   */
  async removePhoto(photoId: string) {
    return this.photoService.deletePhotoAndFile(photoId);
  }

  /**
   * Find products linked to a category. Delegates to repository query builder.
   *
   * @param categoryId - category uuid
   * @param storeId - optional store id to filter
   */
  async findProductsByCategory(
    categoryId: string,
    storeId?: string
  ): Promise<Product[]> {
    return this.productRepo.findProductsByCategory(categoryId, storeId);
  }

  /**
   * Attach (assign) an existing category to a product (ManyToMany).
   * Loads the product with categories, pushes new category if not present and saves.
   *
   * @param productId - product uuid
   * @param categoryId - category uuid
   */
  async attachCategoryToProduct(
    productId: string,
    categoryId: string
  ): Promise<Product> {
    const product = await this.productRepo.findOne({
      where: { id: productId },
      relations: ['categories', 'store'],
    });

    if (!product) throw new NotFoundException('Product not found');

    const category = await this.categoriesService.findOne(categoryId);
    if (!category) throw new NotFoundException('Category not found');

    product.categories = product.categories ?? [];
    const already = product.categories.some((c) => c.id === category.id);
    if (!already) {
      product.categories.push(category);
      await this.productRepo.save(product);
    }
    return product;
  }

  async attachMultipleCategories(
    productId: string,
    categoryIds: string[]
  ): Promise<Product> {
    const product = await this.productRepo.findOne({
      where: { id: productId },
      relations: ['categories', 'store'],
    });

    if (!product) throw new NotFoundException('Product not found');

    for (const categoryId of categoryIds) {
      const category = await this.categoriesService.findOne(categoryId);
      if (!category) throw new NotFoundException('Category not found');

      product.categories = product.categories ?? [];
      const already = product.categories.some((c) => c.id === category.id);
      if (!already) {
        product.categories.push(category);
        await this.productRepo.save(product);
      }
    }
    return product;
  }
}
