import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateProductDto } from 'src/modules/products/dto/create-product.dto';
import { UpdateProductDto } from 'src/modules/products/dto/update-product.dto';
import { PaginatedService } from 'src/common/abstracts/paginated.service';
import { IStoreService } from 'src/common/contracts/products.contract';
import { ProductRepository } from 'src/modules/products/repositories/products.repository';
import { ProductSearchRepository } from '../repositories/product-search.repository';
import { CategoriesService } from 'src/modules/store/categories/categories.service';
import { ProductPhotoService } from '../product-photo/product-photo.service';
import { ProductsMapper } from '../products.mapper';
import { Product } from 'src/entities/store/product/product.entity';
import {
  ProductDetailDto,
  ProductDto,
  ProductListDto,
  ProductStatsDto,
} from 'src/modules/products/dto/product.dto';
import { VariantsService } from 'src/modules/store/variants/variants.service';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import {
  AdvancedSearchOptions,
  ProductSearchOptions,
} from 'src/modules/products/types';
import { ProductPhoto } from 'src/entities/store/product/product-photo.entity';
import { CreateVariantDto } from 'src/modules/store/variants/dto/create-variant.dto';
import { ProductVariant } from 'src/entities/store/product/variant.entity';
import { UpdateVariantDto } from 'src/modules/store/variants/dto/update-variant.dto';

@Injectable()
export class ProductsService extends PaginatedService<
  Product,
  CreateProductDto,
  UpdateProductDto,
  ProductDto
> {
  constructor(
    private readonly productRepo: ProductRepository,
    private readonly productSearchRepo: ProductSearchRepository,
    private readonly categoriesService: CategoriesService,
    private readonly photoService: ProductPhotoService,
    private readonly productsMapper: ProductsMapper,
    private readonly variantsService: VariantsService,
    @Inject(IStoreService) private readonly storeService: IStoreService
  ) {
    super(productRepo, productsMapper);
  }

  async paginate(
    pagination: PaginationDto,
    filters: AdvancedSearchOptions
  ): Promise<[ProductListDto[], number]> {
    const { products, total } = await this.productSearchRepo.advancedSearch({
      ...filters,
      limit: pagination.take,
      offset: pagination.skip,
    });
    return [products, total];
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
   * Get product with all relations mapped to DetailDto
   */
  async findProductDetail(id: string): Promise<ProductDetailDto> {
    const product = await this.productRepo.findWithRelations(id);
    if (!product)
      throw new NotFoundException(`Product with id ${id} not found`);

    return this.productsMapper.toDetailDto(product);
  }
  /**
   * Get all products for a store as list DTOs
   */
  async findAllByStoreAsList(storeId: string): Promise<ProductListDto[]> {
    const products = await this.productRepo.findAllByStore(storeId);
    if (!products) {
      throw new NotFoundException(
        `Products with store id ${storeId} not found`
      );
    }
    return this.productsMapper.toListDtos(products);
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
  ): Promise<ProductDto> {
    const store = await this.storeService.getEntityById(dto.storeId);
    if (!store) throw new NotFoundException('Store not found');

    const product = await this.productRepo.createEntity({
      name: dto.name,
      description: dto.description,
      storeId: store.id,
    });

    if (dto.variants && dto.variants.length) {
      await this.attachVariantsToProduct(product, dto.variants);
    }

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
      await this.addMainPhoto(product.id, store.id, [firstPhoto]);
      await this.addPhotos(product.id, store.id, savePhotos);
    }

    return this.productsMapper.toDto(
      (await this.findProductWithRelations(product.id))!
    );
  }

  async updateProduct(
    id: string,
    dto: UpdateProductDto,
    photos?: Express.Multer.File[]
  ): Promise<ProductDto> {
    const product = await this.findProductWithRelations(id);
    if (!product)
      throw new NotFoundException(`Product with id ${id} not found`);

    if (dto.variants && dto.variants.length) {
      await this.variantsService.createMultiple(dto.variants);
    }
    if (dto.updateVariants && dto.updateVariants.length) {
      await this.variantsService.updateMultiple(dto.updateVariants);
    }

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
      await this.addPhotos(product.id, product.storeId, savePhotos);
    }

    await super.update(id, dto);

    return this.productsMapper.toDto(
      (await this.findProductWithRelations(product.id))!
    );
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

    const product = await this.productRepo.findWithRelations(productId);
    if (!product) throw new NotFoundException('Product not found');

    const store = await this.storeService.getEntityById(storeId);
    if (!store) throw new NotFoundException('Store not found');
    const addPhotos = await this.photoService.addPhotos(product, store, photos);

    if (addPhotos) {
      product.photos = [...product.photos, ...addPhotos];
    }
    await this.productRepo.save(product);
    return addPhotos;
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
   * @param photos - uploaded file to use as main photo
   * @returns the created ProductPhoto entity (or whatever photoService returns)
   * @throws NotFoundException when product is not found
   */
  async addMainPhoto(
    productId: string,
    storeId: string,
    photos: Express.Multer.File[]
  ) {
    const product = await this.findProductWithRelations(productId);
    if (!product) throw new NotFoundException('Product not found');

    const store = await this.storeService.getEntityById(storeId);
    if (!store) throw new NotFoundException('Store not found');

    const addedPhotos = await this.photoService.addPhotos(
      product,
      store,
      photos,
      true
    );

    if (addedPhotos && addedPhotos.length > 0) {
      const mainPhoto = addedPhotos[0];
      product.mainPhotoUrl = mainPhoto.url;
      product.photos.push(mainPhoto);
      await this.productRepo.save(product);
      return mainPhoto;
    }
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
    const photo = await this.photoService.findOne(photoId);
    if (!photo) throw new NotFoundException('Photo not found');
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
  ): Promise<ProductListDto[]> {
    const result = await this.productRepo.findProductsByCategory(
      categoryId,
      storeId
    );
    return this.productsMapper.toListDtos(result);
  }

  private async attachCategory(
    categoryId: string,
    product: Product
  ): Promise<ProductDetailDto> {
    const category = await this.categoriesService.findOne(categoryId);
    if (!category) throw new NotFoundException('Category not found');

    product.categories = product.categories ?? [];
    const already = product.categories.some((c) => c.id === category.id);
    if (!already) {
      product.categories.push(category);
      await this.productRepo.save(product);
    }
    return this.productsMapper.toDetailDto(product);
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
  ): Promise<ProductDetailDto> {
    const product = await this.productRepo.findOne({
      where: { id: productId },
      relations: ['categories', 'store'],
    });

    if (!product) throw new NotFoundException('Product not found');

    for (const category of product.categories) {
      if (category.id === categoryId)
        throw new BadRequestException(
          `Product ${productId} already has this category`
        );
    }

    return this.attachCategory(categoryId, product);
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
      await this.attachCategory(categoryId, product);
    }
    return product;
  }

  /**
   * Get product statistics
   */
  async getProductStats(productId: string): Promise<ProductStatsDto> {
    const product = await this.productRepo.findOne({
      where: { id: productId },
      select: [
        'id',
        'name',
        'averageRating',
        'reviewCount',
        'likeCount',
        'viewCount',
        'totalSales',
      ],
    });

    if (!product)
      throw new NotFoundException(`Product with id ${productId} not found`);

    return this.productsMapper.toStatsDto(product);
  }

  /**
   * Increment view count when product is viewed
   */
  async incrementViewCount(productId: string): Promise<void> {
    await this.productRepo.increment({ id: productId }, 'viewCount', 1);
  }

  /**
   * Recalculate all cached stats for a product
   * NOTE: The N+1 problem in this method has been fixed in the ProductRepository.
   */
  async recalculateProductStats(productId: string): Promise<void> {
    await this.productRepo.recalculateStats(productId);
  }

  // ===============================
  // Search & Discovery Methods
  // ===============================

  /**
   * Search products by name and description with relevance scoring
   */
  async searchProducts(
    query: string,
    limit: number = 20,
    storeId?: string,
    options?: ProductSearchOptions
  ): Promise<ProductListDto[]> {
    if (!query || query.trim().length === 0) {
      throw new BadRequestException('Search query is required');
    }

    const normalizedQuery = query.trim().toLowerCase();
    const searchTerms = normalizedQuery.split(/\s+/);

    const results = await this.productSearchRepo.searchProducts(
      normalizedQuery,
      limit,
      searchTerms,
      storeId,
      options
    );

    return results.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      averageRating: product.averageRating
        ? Number(product.averageRating)
        : undefined,
      reviewCount: product.reviewCount || 0,
      likeCount: product.likeCount || 0,
      viewCount: product.viewCount || 0,
      totalSales: product.totalSales || 0,
      mainPhotoUrl: product.mainPhotoUrl,
      variants: product.variants,
      minPrice: product.minPrice ? Number(product.minPrice) : undefined,
      maxPrice: product.maxPrice ? Number(product.maxPrice) : undefined,
    }));
  }

  /**
   * Advanced product search with comprehensive filters
   */
  async advancedProductSearch(
    filters: AdvancedSearchOptions
  ): Promise<{ products: ProductListDto[]; total: number }> {
    return await this.productSearchRepo.advancedSearch(filters);
  }

  /**
   * Autocomplete suggestions for product search
   */
  async autocompleteProducts(
    storeId: string,
    query: string,
    limit: number = 10
  ): Promise<
    Array<{
      id: string;
      name: string;
      mainPhotoUrl?: string;
      minPrice?: number;
    }>
  > {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const normalizedQuery = query.trim().toLowerCase();

    const results = await this.productSearchRepo.autocompleteProducts(
      storeId,
      normalizedQuery,
      limit
    );

    return results.map((r: any) => ({
      id: r.p_id,
      name: r.p_name,
      mainPhotoUrl: r.mainPhotoUrl,
      minPrice: r.minPrice ? Number(r.minPrice) : undefined,
    }));
  }

  /**
   * Soft delete a product
   */
  async softDelete(id: string): Promise<void> {
    const exists = await this.findOne(id);
    if (!exists) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }
    await this.productRepo.softDelete(id);
  }

  async findRelatedProducts(
    productId: string,
    limit: number = 10
  ): Promise<ProductListDto[]> {
    const product = await this.productRepo.findOne({
      where: { id: productId },
      relations: ['categories'],
    });

    if (!product || !product.categories || product.categories.length === 0) {
      return [];
    }

    const categoryIds = product.categories.map((c) => c.id);

    const relatedProducts = await this.productRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.categories', 'c')
      .where('c.id IN (:...categoryIds)', { categoryIds })
      .andWhere('p.id != :productId', { productId })
      .take(limit)
      .getMany();

    return this.productsMapper.toListDtos(relatedProducts);
  }

  async findAllByStoreWithFilters(
    storeId: string,
    filters: ProductSearchOptions
  ): Promise<ProductListDto[]> {
    return await this.productSearchRepo.searchProducts(
      filters.query || '',
      filters.limit || 20,
      (filters.query || '').trim().toLowerCase().split(/\s+/),
      storeId,
      filters
    );
  }

  /**
   * Remove a category from a product
   */
  async removeCategoryFromProduct(
    productId: string,
    categoryId: string
  ): Promise<void> {
    const product = await this.productRepo.findOne({
      where: { id: productId },
      relations: ['categories'],
    });

    if (!product) throw new NotFoundException('Product not found');

    product.categories =
      product.categories?.filter((c) => c.id !== categoryId) || [];
    await this.productRepo.save(product);
  }

  async attachVariantsToProduct(
    product: Product,
    dtos: CreateVariantDto[]
  ): Promise<ProductVariant[]> {
    for (const dto of dtos) {
      if (!dto.productId) {
        dto.productId = product.id;
      }
    }
    return this.variantsService.createMultiple(dtos);
  }

  async updateMultiple(
    productId: string,
    dtos: UpdateVariantDto[]
  ): Promise<ProductVariant[]> {
    const product = await this.findProductWithRelations(productId);
    if (!product) throw new NotFoundException('Product not found');
    return this.variantsService.updateMultiple(dtos);
  }
}
