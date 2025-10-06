import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateProductDto } from 'src/modules/products/dto/create-product.dto';
import { UpdateProductDto } from 'src/modules/products/dto/update-product.dto';
import { BaseService } from 'src/common/abstracts/base.service';
import { Product } from 'src/entities/store/product/product.entity';
import { ProductRepository } from 'src/modules/products/products.repository';
import { ProductPhotoService } from 'src/modules/products/product-photo/product-photo.service';
import { CategoriesService } from 'src/modules/store/categories/categories.service';
import { ProductPhoto } from 'src/entities/store/product/product-photo.entity';
import { IStoreService } from 'src/common/contracts/products.contract';
import {
  ProductDetailDto,
  ProductDto,
  ProductListDto,
  ProductStatsDto,
} from 'src/modules/products/dto/product.dto';
import { ProductsMapper } from 'src/modules/products/products.mapper';

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
  UpdateProductDto,
  ProductDto
> {
  constructor(
    private readonly productRepo: ProductRepository,
    private readonly categoriesService: CategoriesService,
    private readonly photoService: ProductPhotoService,
    private readonly productsMapper: ProductsMapper,
    @Inject(IStoreService) private readonly storeService: IStoreService
  ) {
    super(productRepo, productsMapper);
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
    if (!product) throw new NotFoundException('Product not found');

    return this.productsMapper.toDetailDto(product);
  }
  /**
   * Get all products for a store as list DTOs
   */
  async findAllByStoreAsList(storeId: string): Promise<ProductListDto[]> {
    const products = await this.productRepo.findAllByStore(storeId);
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

  private async attachCategory(
    categoryId: string,
    product: Product
  ): Promise<Product> {
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

    if (!product) throw new NotFoundException('Product not found');

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
    storeId: string,
    query: string,
    limit: number = 20,
    options?: {
      sortBy?: 'relevance' | 'views' | 'sales' | 'rating' | 'price' | 'recent';
      minPrice?: number;
      maxPrice?: number;
      minRating?: number;
      categoryId?: string;
    }
  ): Promise<ProductListDto[]> {
    if (!query || query.trim().length === 0) {
      throw new BadRequestException('Search query is required');
    }

    const normalizedQuery = query.trim().toLowerCase();
    const searchTerms = normalizedQuery.split(/\s+/);

    // Build base query
    const qb = this.productRepo
      .createQueryBuilder('p')
      .leftJoin('p.photos', 'photos', 'photos.isMain = true')
      .leftJoin('p.variants', 'variants')
      .select([
        'p.id',
        'p.name',
        'p.description',
        'p.averageRating',
        'p.reviewCount',
        'p.likeCount',
        'p.viewCount',
        'p.totalSales',
      ])
      .addSelect('photos.url', 'mainPhotoUrl')
      .addSelect('MIN(variants.price)', 'minPrice')
      .addSelect('MAX(variants.price)', 'maxPrice')
      .where('p.storeId = :storeId', { storeId })
      .andWhere('p.deletedAt IS NULL');

    // Multi-term search
    if (searchTerms.length === 1) {
      qb.andWhere(
        '(LOWER(p.name) LIKE :query OR LOWER(p.description) LIKE :query)',
        { query: `%${normalizedQuery}%` }
      );
    } else {
      searchTerms.forEach((term, index) => {
        qb.andWhere(
          `(LOWER(p.name) LIKE :term${index} OR LOWER(p.description) LIKE :term${index})`,
          { [`term${index}`]: `%${term}%` }
        );
      });
    }

    // Apply filters
    if (options?.categoryId) {
      qb.leftJoin('p.categories', 'category').andWhere(
        'category.id = :categoryId',
        { categoryId: options.categoryId }
      );
    }

    if (options?.minRating) {
      qb.andWhere('p.averageRating >= :minRating', {
        minRating: options.minRating,
      });
    }

    // Price filtering (done in HAVING since it's aggregated)
    const havingConditions: string[] = [];
    if (options?.minPrice) {
      havingConditions.push('MIN(variants.price) >= :minPrice');
      qb.setParameter('minPrice', options.minPrice);
    }
    if (options?.maxPrice) {
      havingConditions.push('MAX(variants.price) <= :maxPrice');
      qb.setParameter('maxPrice', options.maxPrice);
    }

    // Calculate relevance score
    let relevanceScore = `
    CASE
      WHEN LOWER(p.name) = :exactQuery THEN 1000
      WHEN LOWER(p.name) LIKE :startsWithQuery THEN 500
      WHEN LOWER(p.name) LIKE :query THEN 100
      WHEN LOWER(p.description) LIKE :query THEN 50
      ELSE 10
    END
  `;

    // Add popularity and engagement boost
    relevanceScore += ` + (p.viewCount * 0.1) + (p.likeCount * 0.5) + (p.totalSales * 2)`;

    qb.addSelect(`(${relevanceScore})`, 'relevanceScore')
      .setParameter('exactQuery', normalizedQuery)
      .setParameter('startsWithQuery', `${normalizedQuery}%`)
      .setParameter('query', `%${normalizedQuery}%`);

    // Group by for aggregates
    qb.groupBy('p.id').addGroupBy('photos.url');

    // Apply HAVING if needed
    if (havingConditions.length > 0) {
      qb.having(havingConditions.join(' AND '));
    }

    // Apply sorting
    const sortBy = options?.sortBy || 'relevance';
    switch (sortBy) {
      case 'views':
        qb.orderBy('p.viewCount', 'DESC');
        break;
      case 'sales':
        qb.orderBy('p.totalSales', 'DESC');
        break;
      case 'rating':
        qb.orderBy('p.averageRating', 'DESC').addOrderBy(
          'p.reviewCount',
          'DESC'
        );
        break;
      case 'price':
        qb.orderBy('MIN(variants.price)', 'ASC');
        break;
      case 'recent':
        qb.orderBy('p.createdAt', 'DESC');
        break;
      case 'relevance':
      default:
        qb.orderBy('relevanceScore', 'DESC').addOrderBy('p.viewCount', 'DESC');
        break;
    }

    qb.limit(limit);

    const results = await qb.getRawMany();

    return results.map((r) => ({
      id: r.p_id,
      name: r.p_name,
      description: r.p_description,
      averageRating: r.p_averageRating ? Number(r.p_averageRating) : undefined,
      reviewCount: r.p_reviewCount || 0,
      likeCount: r.p_likeCount || 0,
      viewCount: r.p_viewCount || 0,
      totalSales: r.p_totalSales || 0,
      mainPhotoUrl: r.mainPhotoUrl,
      minPrice: r.minPrice ? Number(r.minPrice) : undefined,
      maxPrice: r.maxPrice ? Number(r.maxPrice) : undefined,
    }));
  }

  /**
   * Advanced product search with comprehensive filters
   */
  async advancedProductSearch(filters: {
    storeId: string;
    query?: string;
    categoryIds?: string[];
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    maxRating?: number;
    inStock?: boolean;
    sortBy?: 'name' | 'price' | 'rating' | 'views' | 'sales' | 'recent';
    sortOrder?: 'ASC' | 'DESC';
    limit?: number;
    offset?: number;
  }): Promise<{ products: ProductListDto[]; total: number }> {
    const qb = this.productRepo
      .createQueryBuilder('p')
      .leftJoin('p.photos', 'photos', 'photos.isMain = true')
      .leftJoin('p.variants', 'variants')
      .select([
        'p.id',
        'p.name',
        'p.description',
        'p.averageRating',
        'p.reviewCount',
        'p.likeCount',
        'p.viewCount',
        'p.totalSales',
        'p.createdAt',
      ])
      .addSelect('photos.url', 'mainPhotoUrl')
      .addSelect('MIN(variants.price)', 'minPrice')
      .addSelect('MAX(variants.price)', 'maxPrice')
      .where('p.storeId = :storeId', { storeId: filters.storeId })
      .andWhere('p.deletedAt IS NULL');

    // Text search
    if (filters.query) {
      const normalizedQuery = filters.query.trim().toLowerCase();
      qb.andWhere(
        '(LOWER(p.name) LIKE :query OR LOWER(p.description) LIKE :query)',
        { query: `%${normalizedQuery}%` }
      );
    }

    // Category filter
    if (filters.categoryIds && filters.categoryIds.length > 0) {
      qb.leftJoin('p.categories', 'category').andWhere(
        'category.id IN (:...categoryIds)',
        {
          categoryIds: filters.categoryIds,
        }
      );
    }

    // Rating filters
    if (filters.minRating !== undefined) {
      qb.andWhere('p.averageRating >= :minRating', {
        minRating: filters.minRating,
      });
    }
    if (filters.maxRating !== undefined) {
      qb.andWhere('p.averageRating <= :maxRating', {
        maxRating: filters.maxRating,
      });
    }

    // In stock filter
    if (filters.inStock) {
      qb.leftJoin('variants.inventory', 'inventory').andWhere(
        'inventory.quantity > 0'
      );
    }

    // Group by
    qb.groupBy('p.id').addGroupBy('photos.url');

    // Price filters (in HAVING)
    const havingConditions: string[] = [];
    if (filters.minPrice !== undefined) {
      havingConditions.push('MIN(variants.price) >= :minPrice');
      qb.setParameter('minPrice', filters.minPrice);
    }
    if (filters.maxPrice !== undefined) {
      havingConditions.push('MAX(variants.price) <= :maxPrice');
      qb.setParameter('maxPrice', filters.maxPrice);
    }
    if (havingConditions.length > 0) {
      qb.having(havingConditions.join(' AND '));
    }

    // Count total before pagination
    const countQb = qb.clone();
    const total = await countQb.getCount();

    // Sorting
    const sortBy = filters.sortBy || 'recent';
    const sortOrder = filters.sortOrder || 'DESC';

    switch (sortBy) {
      case 'name':
        qb.orderBy('p.name', sortOrder);
        break;
      case 'price':
        qb.orderBy('MIN(variants.price)', sortOrder);
        break;
      case 'rating':
        qb.orderBy('p.averageRating', sortOrder).addOrderBy(
          'p.reviewCount',
          sortOrder
        );
        break;
      case 'views':
        qb.orderBy('p.viewCount', sortOrder);
        break;
      case 'sales':
        qb.orderBy('p.totalSales', sortOrder);
        break;
      case 'recent':
      default:
        qb.orderBy('p.createdAt', sortOrder);
        break;
    }

    // Pagination
    const limit = filters.limit || 20;
    const offset = filters.offset || 0;
    qb.skip(offset).take(limit);

    const results = await qb.getRawMany();

    return {
      products: results.map((r) => ({
        id: r.p_id,
        name: r.p_name,
        description: r.p_description,
        averageRating: r.p_averageRating
          ? Number(r.p_averageRating)
          : undefined,
        reviewCount: r.p_reviewCount || 0,
        likeCount: r.p_likeCount || 0,
        viewCount: r.p_viewCount || 0,
        totalSales: r.p_totalSales || 0,
        mainPhotoUrl: r.mainPhotoUrl,
        minPrice: r.minPrice ? Number(r.minPrice) : undefined,
        maxPrice: r.maxPrice ? Number(r.maxPrice) : undefined,
      })),
      total,
    };
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

    const results = await this.productRepo
      .createQueryBuilder('p')
      .leftJoin('p.photos', 'photos', 'photos.isMain = true')
      .leftJoin('p.variants', 'variants')
      .select(['p.id', 'p.name'])
      .addSelect('photos.url', 'photoUrl')
      .addSelect('MIN(variants.price)', 'minPrice')
      .where('p.storeId = :storeId', { storeId })
      .andWhere('p.deletedAt IS NULL')
      .andWhere('LOWER(p.name) LIKE :query', { query: `${normalizedQuery}%` })
      .groupBy('p.id')
      .addGroupBy('photos.url')
      .orderBy('p.viewCount', 'DESC')
      .limit(limit)
      .getRawMany();

    return results.map((r) => ({
      id: r.p_id,
      name: r.p_name,
      mainPhotoUrl: r.photoUrl,
      minPrice: r.minPrice ? Number(r.minPrice) : undefined,
    }));
  }

  // ===============================
  // Ranking & Leaderboard Methods
  // ===============================

  /**
   * Get top products by view count
   * Uses cached viewCount for instant results
   */
  async getTopProductsByViews(
    storeId: string,
    limit: number = 10
  ): Promise<ProductListDto[]> {
    const products = await this.productRepo
      .createQueryBuilder('p')
      .leftJoin('p.photos', 'photos', 'photos.isMain = true')
      .leftJoin('p.variants', 'variants')
      .select([
        'p.id',
        'p.name',
        'p.description',
        'p.averageRating',
        'p.reviewCount',
        'p.likeCount',
        'p.viewCount',
        'p.totalSales',
      ])
      .addSelect('photos.url', 'mainPhotoUrl')
      .addSelect('MIN(variants.price)', 'minPrice')
      .addSelect('MAX(variants.price)', 'maxPrice')
      .where('p.storeId = :storeId', { storeId })
      .andWhere('p.deletedAt IS NULL')
      .andWhere('p.viewCount > 0') // Only products with views
      .groupBy('p.id')
      .addGroupBy('photos.url')
      .orderBy('p.viewCount', 'DESC')
      .limit(limit)
      .getRawMany();

    return this.mapRawProductsToListDto(products);
  }

  /**
   * Get top products by total sales
   * Uses cached totalSales for instant results
   */
  async getTopProductsBySales(
    storeId: string,
    limit: number = 10
  ): Promise<ProductListDto[]> {
    const products = await this.productRepo
      .createQueryBuilder('p')
      .leftJoin('p.photos', 'photos', 'photos.isMain = true')
      .leftJoin('p.variants', 'variants')
      .select([
        'p.id',
        'p.name',
        'p.description',
        'p.averageRating',
        'p.reviewCount',
        'p.likeCount',
        'p.viewCount',
        'p.totalSales',
      ])
      .addSelect('photos.url', 'mainPhotoUrl')
      .addSelect('MIN(variants.price)', 'minPrice')
      .addSelect('MAX(variants.price)', 'maxPrice')
      .where('p.storeId = :storeId', { storeId })
      .andWhere('p.deletedAt IS NULL')
      .andWhere('p.totalSales > 0') // Only products with sales
      .groupBy('p.id')
      .addGroupBy('photos.url')
      .orderBy('p.totalSales', 'DESC')
      .limit(limit)
      .getRawMany();

    return this.mapRawProductsToListDto(products);
  }

  /**
   * Get top rated products
   * Uses cached averageRating and reviewCount
   * Requires minimum review threshold for credibility
   */
  async getTopRatedProducts(
    storeId: string,
    limit: number = 10,
    minReviews: number = 5
  ): Promise<ProductListDto[]> {
    const products = await this.productRepo
      .createQueryBuilder('p')
      .leftJoin('p.photos', 'photos', 'photos.isMain = true')
      .leftJoin('p.variants', 'variants')
      .select([
        'p.id',
        'p.name',
        'p.description',
        'p.averageRating',
        'p.reviewCount',
        'p.likeCount',
        'p.viewCount',
        'p.totalSales',
      ])
      .addSelect('photos.url', 'mainPhotoUrl')
      .addSelect('MIN(variants.price)', 'minPrice')
      .addSelect('MAX(variants.price)', 'maxPrice')
      .where('p.storeId = :storeId', { storeId })
      .andWhere('p.deletedAt IS NULL')
      .andWhere('p.reviewCount >= :minReviews', { minReviews })
      .andWhere('p.averageRating IS NOT NULL')
      .groupBy('p.id')
      .addGroupBy('photos.url')
      .orderBy('p.averageRating', 'DESC')
      .addOrderBy('p.reviewCount', 'DESC') // Tiebreaker: more reviews
      .limit(limit)
      .getRawMany();

    return this.mapRawProductsToListDto(products);
  }

  /**
   * Get top products by conversion rate
   * Calculated as: (totalSales / viewCount) * 100
   * Requires minimum view threshold to filter noise
   */
  async getTopProductsByConversionRate(
    storeId: string,
    limit: number = 10,
    minViews: number = 50
  ): Promise<ProductListDto[]> {
    const products = await this.productRepo
      .createQueryBuilder('p')
      .leftJoin('p.photos', 'photos', 'photos.isMain = true')
      .leftJoin('p.variants', 'variants')
      .select([
        'p.id',
        'p.name',
        'p.description',
        'p.averageRating',
        'p.reviewCount',
        'p.likeCount',
        'p.viewCount',
        'p.totalSales',
      ])
      .addSelect('photos.url', 'mainPhotoUrl')
      .addSelect('MIN(variants.price)', 'minPrice')
      .addSelect('MAX(variants.price)', 'maxPrice')
      .addSelect(
        '(CAST(p.totalSales AS FLOAT) / NULLIF(p.viewCount, 0))',
        'conversionRate'
      )
      .where('p.storeId = :storeId', { storeId })
      .andWhere('p.deletedAt IS NULL')
      .andWhere('p.viewCount >= :minViews', { minViews })
      .andWhere('p.totalSales > 0') // Must have at least one sale
      .groupBy('p.id')
      .addGroupBy('photos.url')
      .orderBy('conversionRate', 'DESC')
      .addOrderBy('p.totalSales', 'DESC') // Tiebreaker: more sales
      .limit(limit)
      .getRawMany();

    return this.mapRawProductsToListDto(products);
  }

  /**
   * Get trending products based on recent activity
   * Algorithm: Combines recent views, likes, and sales with time decay
   *
   * Trending score = (views * 1) + (likes * 2) + (sales * 5) + recencyBoost
   */
  async getTrendingProducts(
    storeId: string,
    limit: number = 10,
    days: number = 7
  ): Promise<ProductListDto[]> {
    // Calculate date threshold
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - days);
    const dateThreshold = thresholdDate.toISOString();

    // Get products with their recent activity
    const products = await this.productRepo
      .createQueryBuilder('p')
      .leftJoin('p.photos', 'photos', 'photos.isMain = true')
      .leftJoin('p.variants', 'variants')
      .leftJoinAndSelect(
        'analytics_events',
        'events',
        'events.product_id = p.id AND events.created_at >= :dateThreshold',
        { dateThreshold }
      )
      .select([
        'p.id',
        'p.name',
        'p.description',
        'p.averageRating',
        'p.reviewCount',
        'p.likeCount',
        'p.viewCount',
        'p.totalSales',
        'p.createdAt',
      ])
      .addSelect('photos.url', 'mainPhotoUrl')
      .addSelect('MIN(variants.price)', 'minPrice')
      .addSelect('MAX(variants.price)', 'maxPrice')
      .addSelect(
        `COUNT(CASE WHEN events.event_type = 'view' THEN 1 END)`,
        'recentViews'
      )
      .addSelect(
        `COUNT(CASE WHEN events.event_type = 'like' THEN 1 END)`,
        'recentLikes'
      )
      .addSelect(
        `COUNT(CASE WHEN events.event_type = 'purchase' THEN 1 END)`,
        'recentSales'
      )
      .where('p.storeId = :storeId', { storeId })
      .andWhere('p.deletedAt IS NULL')
      .groupBy('p.id')
      .addGroupBy('photos.url')
      .getRawMany();

    // Calculate trending score for each product
    const scoredProducts = products.map((p) => {
      const recentViews = parseInt(p.recentViews) || 0;
      const recentLikes = parseInt(p.recentLikes) || 0;
      const recentSales = parseInt(p.recentSales) || 0;

      // Calculate recency boost (newer products get slight advantage)
      const productAge = Date.now() - new Date(p.p_createdAt).getTime();
      const daysOld = productAge / (1000 * 60 * 60 * 24);
      const recencyBoost = Math.max(0, 100 - daysOld * 2); // Decreases over time

      // Weighted trending score
      const trendingScore =
        recentViews + recentLikes * 2 + recentSales * 5 + recencyBoost;

      return {
        ...p,
        trendingScore,
        recentViews,
        recentLikes,
        recentSales,
      };
    });

    // Sort by trending score and take top results
    const topTrending = scoredProducts
      .filter((p) => p.trendingScore > 0)
      .sort((a, b) => b.trendingScore - a.trendingScore)
      .slice(0, limit);

    return this.mapRawProductsToListDto(topTrending);
  }

  /**
   * Get "hot" products - products with sudden spike in activity
   * Compares recent activity vs historical average
   */
  async getHotProducts(
    storeId: string,
    limit: number = 10,
    comparisonDays: number = 7
  ): Promise<ProductListDto[]> {
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - comparisonDays);
    const recentThreshold = recentDate.toISOString();

    const historicalDate = new Date();
    historicalDate.setDate(historicalDate.getDate() - comparisonDays * 2);
    const historicalThreshold = historicalDate.toISOString();

    const products = await this.productRepo
      .createQueryBuilder('p')
      .leftJoin('p.photos', 'photos', 'photos.isMain = true')
      .leftJoin('p.variants', 'variants')
      .leftJoinAndSelect(
        'analytics_events',
        'recentEvents',
        'recentEvents.product_id = p.id AND recentEvents.created_at >= :recentThreshold',
        { recentThreshold }
      )
      .leftJoinAndSelect(
        'analytics_events',
        'historicalEvents',
        `historicalEvents.product_id = p.id AND historicalEvents.created_at BETWEEN :historicalThreshold AND :recentThreshold`,
        { historicalThreshold, recentThreshold }
      )
      .select([
        'p.id',
        'p.name',
        'p.description',
        'p.averageRating',
        'p.reviewCount',
        'p.likeCount',
        'p.viewCount',
        'p.totalSales',
      ])
      .addSelect('photos.url', 'mainPhotoUrl')
      .addSelect('MIN(variants.price)', 'minPrice')
      .addSelect('MAX(variants.price)', 'maxPrice')
      .addSelect(`COUNT(DISTINCT recentEvents.id)`, 'recentActivity')
      .addSelect(`COUNT(DISTINCT historicalEvents.id)`, 'historicalActivity')
      .where('p.storeId = :storeId', { storeId })
      .andWhere('p.deletedAt IS NULL')
      .groupBy('p.id')
      .addGroupBy('photos.url')
      .getRawMany();

    // Calculate growth rate
    const hotProducts = products
      .map((p) => {
        const recent = parseInt(p.recentActivity) || 0;
        const historical = parseInt(p.historicalActivity) || 1; // Avoid division by zero

        const growthRate = ((recent - historical) / historical) * 100;

        return {
          ...p,
          growthRate,
          recentActivity: recent,
          historicalActivity: historical,
        };
      })
      .filter((p) => p.growthRate > 50) // At least 50% growth
      .sort((a, b) => b.growthRate - a.growthRate)
      .slice(0, limit);

    return this.mapRawProductsToListDto(hotProducts);
  }

  /**
   * Get products by multiple criteria with custom weights
   */
  async getProductsByScore(
    storeId: string,
    limit: number = 10,
    weights: {
      views?: number;
      sales?: number;
      rating?: number;
      likes?: number;
      recency?: number;
    } = {}
  ): Promise<ProductListDto[]> {
    // Default weights if not provided
    const w = {
      views: weights.views ?? 1,
      sales: weights.sales ?? 3,
      rating: weights.rating ?? 2,
      likes: weights.likes ?? 1.5,
      recency: weights.recency ?? 0.5,
    };

    const products = await this.productRepo
      .createQueryBuilder('p')
      .leftJoin('p.photos', 'photos', 'photos.isMain = true')
      .leftJoin('p.variants', 'variants')
      .select([
        'p.id',
        'p.name',
        'p.description',
        'p.averageRating',
        'p.reviewCount',
        'p.likeCount',
        'p.viewCount',
        'p.totalSales',
        'p.createdAt',
      ])
      .addSelect('photos.url', 'mainPhotoUrl')
      .addSelect('MIN(variants.price)', 'minPrice')
      .addSelect('MAX(variants.price)', 'maxPrice')
      .addSelect(
        `(
        (p.viewCount * ${w.views}) +
        (p.totalSales * ${w.sales}) +
        (COALESCE(p.averageRating, 0) * ${w.rating} * 20) +
        (p.likeCount * ${w.likes}) +
        (EXTRACT(EPOCH FROM (NOW() - p.createdAt)) / 86400 * ${w.recency})
      )`,
        'score'
      )
      .where('p.storeId = :storeId', { storeId })
      .andWhere('p.deletedAt IS NULL')
      .groupBy('p.id')
      .addGroupBy('photos.url')
      .orderBy('score', 'DESC')
      .limit(limit)
      .getRawMany();

    return this.mapRawProductsToListDto(products);
  }

  // ===============================
  // Helper Methods
  // ===============================

  /**
   * Map raw query results to ProductListDto
   */
  private mapRawProductsToListDto(rawProducts: any[]): ProductListDto[] {
    return rawProducts.map((p) => ({
      id: p.p_id,
      name: p.p_name,
      description: p.p_description,
      averageRating: p.p_averageRating ? Number(p.p_averageRating) : undefined,
      reviewCount: p.p_reviewCount || 0,
      likeCount: p.p_likeCount || 0,
      viewCount: p.p_viewCount || 0,
      totalSales: p.p_totalSales || 0,
      mainPhotoUrl: p.mainPhotoUrl || p.photoUrl,
      minPrice: p.minPrice ? Number(p.minPrice) : undefined,
      maxPrice: p.maxPrice ? Number(p.maxPrice) : undefined,
    }));
  }

  /**
   * Soft delete a product
   */
  async softDelete(id: string): Promise<void> {
    await this.productRepo.softDelete(id);
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
}
