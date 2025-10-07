import { ProductsMapper } from 'src/modules/products/products.mapper';
import { Product } from 'src/entities/store/product/product.entity';
import { CreateProductDto } from 'src/modules/products/dto/create-product.dto';
import { UpdateProductDto } from 'src/modules/products/dto/update-product.dto';
import { Store } from 'src/entities/store/store.entity';
import { ProductPhoto } from 'src/entities/store/product/product-photo.entity';
import { User } from 'src/entities/user/user.entity';
import { Category } from 'src/entities/store/product/category.entity';
import { ProductVariant } from 'src/entities/store/product/variant.entity';
import { Review } from 'src/entities/store/review.entity';

describe('ProductsMapper', () => {
  let mapper: ProductsMapper;

  beforeEach(() => {
    mapper = new ProductsMapper();
  });

  const createMockProduct = (overrides?: Partial<Product>): Product =>
    ({
      id: 'p1',
      name: 'Test Product',
      description: 'Test Description',
      averageRating: 4.5,
      reviewCount: 10,
      totalSales: 50,
      likeCount: 25,
      viewCount: 1000,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
      store: { id: 's1', name: 'Test Store' } as Store,
      categories: [],
      variants: [],
      photos: [],
      reviews: [],
      ...overrides,
    }) as Product;

  describe('toDto', () => {
    it('should map entity to full DTO', () => {
      const product = createMockProduct();

      const result = mapper.toDto(product);

      expect(result).toEqual({
        id: 'p1',
        name: 'Test Product',
        description: 'Test Description',
        averageRating: 4.5,
        reviewCount: 10,
        totalSales: 50,
        likeCount: 25,
        viewCount: 1000,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        store: product.store,
        categories: [],
        variants: [],
        photos: [],
        reviews: [],
      });
    });

    it('should convert string averageRating to number', () => {
      const product = createMockProduct({ averageRating: '4.5' as any });

      const result = mapper.toDto(product);

      expect(result.averageRating).toBe(4.5);
      expect(typeof result.averageRating).toBe('number');
    });

    it('should handle undefined averageRating', () => {
      const product = createMockProduct({ averageRating: undefined });

      const result = mapper.toDto(product);

      expect(result.averageRating).toBeUndefined();
    });

    it('should include all relations when loaded', () => {
      const product = createMockProduct({
        categories: [{ id: 'c1', name: 'Category' } as Category],
        variants: [{ id: 'v1', sku: 'SKU-001' } as ProductVariant],
        photos: [{ id: 'ph1', url: 'photo.jpg' } as ProductPhoto],
      });

      const result = mapper.toDto(product);

      expect(result.categories).toHaveLength(1);
      expect(result.variants).toHaveLength(1);
      expect(result.photos).toHaveLength(1);
    });
  });

  describe('toListDto', () => {
    it('should map entity to lightweight list DTO', () => {
      const product = createMockProduct();

      const result = mapper.toListDto(product);

      expect(result).toEqual({
        id: 'p1',
        name: 'Test Product',
        description: 'Test Description',
        averageRating: 4.5,
        reviewCount: 10,
        likeCount: 25,
        viewCount: 1000,
        totalSales: 50,
        mainPhotoUrl: undefined,
        minPrice: undefined,
        maxPrice: undefined,
      });
    });

    it('should find main photo from photos array', () => {
      const product = createMockProduct({
        photos: [
          { id: 'ph1', url: 'photo1.jpg', isMain: false } as ProductPhoto,
          { id: 'ph2', url: 'main.jpg', isMain: true } as ProductPhoto,
        ],
      });

      const result = mapper.toListDto(product);

      expect(result.mainPhotoUrl).toBe('main.jpg');
    });

    it('should use provided mainPhotoUrl parameter', () => {
      const product = createMockProduct();

      const result = mapper.toListDto(product, 'custom-photo.jpg');

      expect(result.mainPhotoUrl).toBe('custom-photo.jpg');
    });

    it('should calculate min and max price from variants', () => {
      const product = createMockProduct({
        variants: [
          { id: 'v1', price: 100 } as ProductVariant,
          { id: 'v2', price: 200 } as ProductVariant,
          { id: 'v3', price: 150 } as ProductVariant,
        ],
      });

      const result = mapper.toListDto(product);

      expect(result.minPrice).toBe(100);
      expect(result.maxPrice).toBe(200);
    });

    it('should handle string prices in variants', () => {
      const product = createMockProduct({
        variants: [
          { id: 'v1', price: '100.50' } as any,
          { id: 'v2', price: '200.75' } as any,
        ],
      });

      const result = mapper.toListDto(product);

      expect(result.minPrice).toBe(100.5);
      expect(result.maxPrice).toBe(200.75);
    });

    it('should handle null values gracefully', () => {
      const product = createMockProduct({
        reviewCount: null as any,
        likeCount: null as any,
        viewCount: null as any,
        totalSales: null as any,
      });

      const result = mapper.toListDto(product);

      expect(result.reviewCount).toBe(0);
      expect(result.likeCount).toBe(0);
      expect(result.viewCount).toBe(0);
      expect(result.totalSales).toBe(0);
    });
  });

  describe('toDetailDto', () => {
    it('should map entity to detailed DTO', () => {
      const product = createMockProduct();

      const result = mapper.toDetailDto(product);

      expect(result.id).toBe('p1');
      expect(result.name).toBe('Test Product');
      expect(result.storeId).toBe('s1');
      expect(result.storeName).toBe('Test Store');
    });

    it('should separate main photo from additional photos', () => {
      const product = createMockProduct({
        photos: [
          {
            id: 'ph1',
            url: 'photo1.jpg',
            isMain: false,
            altText: 'Photo 1',
          } as ProductPhoto,
          {
            id: 'ph2',
            url: 'main.jpg',
            isMain: true,
            altText: 'Main',
          } as ProductPhoto,
          {
            id: 'ph3',
            url: 'photo3.jpg',
            isMain: false,
            altText: 'Photo 3',
          } as ProductPhoto,
        ],
      });

      const result = mapper.toDetailDto(product);

      expect(result.mainPhoto).toEqual({
        id: 'ph2',
        url: 'main.jpg',
        altText: 'Main',
      });
      expect(result.photos).toHaveLength(2);
      expect(result.photos[0].id).toBe('ph1');
    });

    it('should map categories', () => {
      const product = createMockProduct({
        categories: [
          { id: 'c1', name: 'Electronics' } as Category,
          { id: 'c2', name: 'Computers' } as Category,
        ],
      });

      const result = mapper.toDetailDto(product);

      expect(result.categories).toEqual([
        { id: 'c1', name: 'Electronics' },
        { id: 'c2', name: 'Computers' },
      ]);
    });

    it('should map variants with inventory', () => {
      const product = createMockProduct({
        variants: [
          {
            id: 'v1',
            sku: 'SKU-001',
            price: 99.99,
            attributes: { color: 'red', size: 'M' },
            inventory: { quantity: 10 } as any,
          } as any,
          {
            id: 'v2',
            sku: 'SKU-002',
            price: 89.99,
            attributes: { color: 'blue', size: 'L' },
            inventory: { quantity: 0 } as any,
          } as any,
        ],
      });

      const result = mapper.toDetailDto(product);

      expect(result.variants[0]).toEqual({
        id: 'v1',
        sku: 'SKU-001',
        price: 99.99,
        attributes: { color: 'red', size: 'M' },
        inStock: true,
        stockQuantity: 10,
      });
      expect(result.variants[1].inStock).toBe(false);
    });

    it('should include recent reviews with user names', () => {
      const product = createMockProduct({
        reviews: [
          {
            id: 'r1',
            rating: 5,
            comment: 'Great!',
            user: { firstName: 'John', lastName: 'Doe' } as User,
            createdAt: new Date('2024-01-01'),
          } as Review,
          {
            id: 'r2',
            rating: 4,
            comment: 'Good',
            user: { firstName: 'Jane', lastName: '' } as User,
            createdAt: new Date('2024-01-02'),
          } as Review,
        ],
      });

      const result = mapper.toDetailDto(product);

      expect(result.recentReviews).toHaveLength(2);
      expect(result.recentReviews[0].userName).toBe('John Doe');
      expect(result.recentReviews[1].userName).toBe('Jane');
    });

    it('should limit reviews to 5', () => {
      const reviews = Array.from({ length: 10 }, (_, i) => ({
        id: `r${i}`,
        rating: 5,
        comment: `Review ${i}`,
        user: { firstName: 'User', lastName: `${i}` } as User,
        createdAt: new Date(),
      })) as Review[];

      const product = createMockProduct({ reviews });

      const result = mapper.toDetailDto(product);

      expect(result.recentReviews).toHaveLength(5);
    });

    it('should handle anonymous users in reviews', () => {
      const product = createMockProduct({
        reviews: [
          {
            id: 'r1',
            rating: 5,
            comment: 'Great!',
            user: null,
            createdAt: new Date(),
          } as any,
        ],
      });

      const result = mapper.toDetailDto(product);

      expect(result.recentReviews[0].userName).toBe('Anonymous');
    });
  });

  describe('toStatsDto', () => {
    it('should map entity to stats DTO with conversion rate', () => {
      const product = createMockProduct({
        viewCount: 1000,
        totalSales: 50,
      });

      const result = mapper.toStatsDto(product);

      expect(result).toEqual({
        id: 'p1',
        name: 'Test Product',
        averageRating: 4.5,
        reviewCount: 10,
        likeCount: 25,
        viewCount: 1000,
        totalSales: 50,
        conversionRate: 5, // (50/1000) * 100 = 5%
      });
    });

    it('should handle zero views for conversion rate', () => {
      const product = createMockProduct({
        viewCount: 0,
        totalSales: 10,
      });

      const result = mapper.toStatsDto(product);

      expect(result.conversionRate).toBe(0);
    });

    it('should round conversion rate to 2 decimals', () => {
      const product = createMockProduct({
        viewCount: 300,
        totalSales: 7,
      });

      const result = mapper.toStatsDto(product);

      expect(result.conversionRate).toBe(2.33); // (7/300) * 100 = 2.333...
    });

    it('should handle null values', () => {
      const product = createMockProduct({
        averageRating: null as any,
        reviewCount: null as any,
        likeCount: null as any,
        viewCount: null as any,
        totalSales: null as any,
      });

      const result = mapper.toStatsDto(product);

      expect(result.averageRating).toBe(0);
      expect(result.reviewCount).toBe(0);
      expect(result.likeCount).toBe(0);
      expect(result.viewCount).toBe(0);
      expect(result.totalSales).toBe(0);
    });
  });

  describe('toEntity', () => {
    it('should map CreateProductDto to entity', () => {
      const dto: CreateProductDto = {
        name: 'New Product',
        description: 'New Description',
        storeId: 's1',
      };

      const result = mapper.toEntity(dto);

      expect(result.name).toBe('New Product');
      expect(result.description).toBe('New Description');
      expect(result.reviewCount).toBe(0);
      expect(result.totalSales).toBe(0);
      expect(result.likeCount).toBe(0);
      expect(result.viewCount).toBe(0);
    });

    it('should preserve id if provided', () => {
      const dto: Partial<CreateProductDto> = {
        id: 'existing-id',
        name: 'Product',
      };

      const result = mapper.toEntity(dto);

      expect(result.id).toBe('existing-id');
    });
  });

  describe('fromUpdateDto', () => {
    it('should map UpdateProductDto to partial entity', () => {
      const dto: UpdateProductDto = {
        name: 'Updated Name',
        description: 'Updated Description',
      };

      const result = mapper.fromUpdateDto(dto);

      expect(result).toEqual({
        name: 'Updated Name',
        description: 'Updated Description',
      });
    });

    it('should only include defined fields', () => {
      const dto: UpdateProductDto = {
        name: 'Updated Name',
      };

      const result = mapper.fromUpdateDto(dto);

      expect(result.name).toBe('Updated Name');
      expect(result.description).toBeUndefined();
    });

    it('should handle empty update', () => {
      const dto: UpdateProductDto = {};

      const result = mapper.fromUpdateDto(dto);

      expect(result).toEqual({});
    });
  });

  describe('toCreateDto', () => {
    it('should map entity back to CreateProductDto', () => {
      const product = createMockProduct({
        categories: [{ id: 'c1', name: 'Cat1' } as Category],
      });

      const result = mapper.toCreateDto(product);

      expect(result).toEqual({
        id: 'p1',
        name: 'Test Product',
        description: 'Test Description',
        storeId: 's1',
        categoryIds: ['c1'],
        categoryId: 'c1',
      });
    });

    it('should handle product without categories', () => {
      const product = createMockProduct({ categories: [] });

      const result = mapper.toCreateDto(product);

      expect(result.categoryIds).toEqual([]);
      expect(result.categoryId).toBeUndefined();
    });
  });

  describe('batch mapping', () => {
    it('should map multiple entities to list DTOs', () => {
      const products = [
        createMockProduct({ id: 'p1', name: 'Product 1' }),
        createMockProduct({ id: 'p2', name: 'Product 2' }),
      ];

      const result = mapper.toListDtos(products);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('p1');
      expect(result[1].id).toBe('p2');
    });

    it('should map multiple entities to stats DTOs', () => {
      const products = [
        createMockProduct({ id: 'p1' }),
        createMockProduct({ id: 'p2' }),
      ];

      const result = mapper.toStatsDtos(products);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('p1');
      expect(result[1].id).toBe('p2');
    });
  });
});
