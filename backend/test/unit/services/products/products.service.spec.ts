import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from 'src/modules/products/services/products.service';
import { ProductRepository } from 'src/modules/products/repositories/products.repository';
import { ProductQueryRepository } from 'src/modules/products/repositories/product-query.repository';
import { ProductRankingRepository } from 'src/modules/products/repositories/product-ranking.repository';
import { ProductSearchRepository } from 'src/modules/products/repositories/product-search.repository';
import { CategoriesService } from 'src/modules/store/categories/categories.service';
import { ProductPhotoService } from 'src/modules/products/product-photo/product-photo.service';
import { ProductsMapper } from 'src/modules/products/products.mapper';
import { IStoreService } from 'src/common/contracts/products.contract';
import { Product } from 'src/entities/store/product/product.entity';
import { Store } from 'src/entities/store/store.entity';
import { CreateProductDto } from 'src/modules/products/dto/create-product.dto';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  createRepositoryMock,
  createServiceMock,
  createMapperMock,
  MockedMethods,
} from 'test/unit/helpers';

describe('ProductsService', () => {
  let service: ProductsService;
  let productRepo: Partial<MockedMethods<ProductRepository>>;
  let productQueryRepo: Partial<MockedMethods<ProductQueryRepository>>;
  let productRankingRepo: Partial<MockedMethods<ProductRankingRepository>>;
  let productSearchRepo: Partial<MockedMethods<ProductSearchRepository>>;
  let categoriesService: Partial<MockedMethods<CategoriesService>>;
  let photoService: Partial<MockedMethods<ProductPhotoService>>;
  let storeService: any;
  let mapper: Partial<MockedMethods<ProductsMapper>>;

  const mockStore: Store = {
    id: 's1',
    name: 'Test Store',
  } as Store;

  const mockProduct: Product = {
    id: 'p1',
    name: 'Test Product',
    description: 'Description',
    store: mockStore,
    categories: [],
    photos: [],
    variants: [],
    reviews: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Product;

  beforeEach(async () => {
    productRepo = createRepositoryMock<ProductRepository>([
      'createEntity',
      'findOne',
      'findOneBy',
      'save',
      'findAllByStore',
      'findWithRelations',
      'findProductsByCategory',
      'increment',
      'recalculateStats',
      'softDelete',
    ]);

    productQueryRepo = createRepositoryMock<ProductQueryRepository>([]);
    productRankingRepo = createRepositoryMock<ProductRankingRepository>([]);
    productSearchRepo = createRepositoryMock<ProductSearchRepository>([
      'searchProducts',
      'advancedSearch',
      'autocompleteProducts',
    ]);

    categoriesService = createServiceMock<CategoriesService>(['findOne']);
    photoService = createServiceMock<ProductPhotoService>([
      'addPhotos',
      'deletePhotoAndFile',
    ]);
    storeService = { getEntityById: jest.fn() };
    mapper = createMapperMock<ProductsMapper>([
      'toDetailDto',
      'toListDtos',
      'toStatsDto',
    ]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: ProductRepository, useValue: productRepo },
        { provide: ProductQueryRepository, useValue: productQueryRepo },
        { provide: ProductRankingRepository, useValue: productRankingRepo },
        { provide: ProductSearchRepository, useValue: productSearchRepo },
        { provide: CategoriesService, useValue: categoriesService },
        { provide: ProductPhotoService, useValue: photoService },
        { provide: IStoreService, useValue: storeService },
        { provide: ProductsMapper, useValue: mapper },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    jest.clearAllMocks();
  });

  describe('findProductWithRelations', () => {
    it('should delegate to repository', async () => {
      productRepo.findWithRelations!.mockResolvedValue(mockProduct);

      const result = await service.findProductWithRelations('p1');

      expect(result).toEqual(mockProduct);
      expect(productRepo.findWithRelations).toHaveBeenCalledWith('p1');
    });

    it('should return null when product not found', async () => {
      productRepo.findWithRelations!.mockResolvedValue(null);

      const result = await service.findProductWithRelations('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findProductDetail', () => {
    it('should return product detail DTO', async () => {
      const detailDto = { id: 'p1', name: 'Product' };
      productRepo.findWithRelations!.mockResolvedValue(mockProduct);
      mapper.toDetailDto!.mockReturnValue(detailDto as any);

      const result = await service.findProductDetail('p1');

      expect(result).toEqual(detailDto);
      expect(mapper.toDetailDto).toHaveBeenCalledWith(mockProduct);
    });

    it('should throw when product not found', async () => {
      productRepo.findWithRelations!.mockResolvedValue(null);

      await expect(service.findProductDetail('nonexistent')).rejects.toThrow(
        NotFoundException
      );
      await expect(service.findProductDetail('nonexistent')).rejects.toThrow(
        'Product not found'
      );
    });
  });

  describe('findAllByStoreAsList', () => {
    it('should return products as list DTOs', async () => {
      const products = [mockProduct];
      const listDtos = [{ id: 'p1', name: 'Product' }];

      productRepo.findAllByStore!.mockResolvedValue(products);
      mapper.toListDtos!.mockReturnValue(listDtos as any);

      const result = await service.findAllByStoreAsList('s1');

      expect(result).toEqual(listDtos);
      expect(productRepo.findAllByStore).toHaveBeenCalledWith('s1');
      expect(mapper.toListDtos).toHaveBeenCalledWith(products);
    });
  });

  describe('findAllByStore', () => {
    it('should delegate to repository', async () => {
      productRepo.findAllByStore!.mockResolvedValue([mockProduct]);

      const result = await service.findAllByStore('s1');

      expect(result).toEqual([mockProduct]);
      expect(productRepo.findAllByStore).toHaveBeenCalledWith('s1');
    });
  });

  describe('create', () => {
    const dto: CreateProductDto = {
      storeId: 's1',
      name: 'New Product',
      description: 'Description',
    } as any;

    it('should throw when store not found', async () => {
      storeService.getEntityById.mockResolvedValue(null);

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
      await expect(service.create(dto)).rejects.toThrow('Store not found');
    });

    it('should create product without photos', async () => {
      storeService.getEntityById.mockResolvedValue(mockStore);
      productRepo.createEntity!.mockResolvedValue(mockProduct);

      const result = await service.create(dto);

      expect(result).toEqual(mockProduct);
      expect(productRepo.createEntity).toHaveBeenCalledWith({
        name: dto.name,
        description: dto.description,
        store: mockStore,
      });
    });

    it('should attach single category', async () => {
      const dtoWithCategory = { ...dto, categoryId: 'c1' };
      const category = { id: 'c1', name: 'Category' };

      storeService.getEntityById.mockResolvedValue(mockStore);
      productRepo.createEntity!.mockResolvedValue(mockProduct);
      productRepo.findOne!.mockResolvedValue(mockProduct);
      categoriesService.findOne!.mockResolvedValue(category as any);
      productRepo.save!.mockResolvedValue(mockProduct);

      await service.create(dtoWithCategory);

      expect(categoriesService.findOne).toHaveBeenCalledWith('c1');
    });

    it('should attach multiple categories', async () => {
      const dtoWithCategories = { ...dto, categoryIds: ['c1', 'c2'] };
      const category1 = { id: 'c1', name: 'Cat1' };
      const category2 = { id: 'c2', name: 'Cat2' };

      storeService.getEntityById.mockResolvedValue(mockStore);
      productRepo.createEntity!.mockResolvedValue(mockProduct);
      productRepo.findOne!.mockResolvedValue(mockProduct);
      categoriesService
        .findOne!.mockResolvedValueOnce(category1 as any)
        .mockResolvedValueOnce(category2 as any);
      productRepo.save!.mockResolvedValue(mockProduct);

      await service.create(dtoWithCategories);

      expect(categoriesService.findOne).toHaveBeenCalledTimes(2);
    });

    it('should handle photos when array is provided', async () => {
      const photos = [
        {
          buffer: Buffer.from('1'),
          originalname: 'photo1.jpg',
          mimetype: 'image/jpeg',
        },
        {
          buffer: Buffer.from('2'),
          originalname: 'photo2.jpg',
          mimetype: 'image/jpeg',
        },
      ] as Express.Multer.File[];

      storeService.getEntityById.mockResolvedValue(mockStore);
      productRepo.createEntity!.mockResolvedValue(mockProduct);
      productRepo.findOneBy!.mockResolvedValue(mockProduct);
      photoService.addPhotos!.mockResolvedValue([{ id: 'ph1' }] as any);

      await service.create(dto, photos);

      expect(photoService.addPhotos).toHaveBeenNthCalledWith(
        1,
        mockProduct,
        mockStore,
        [photos[0]],
        true
      );

      expect(photoService.addPhotos).toHaveBeenNthCalledWith(
        2,
        mockProduct,
        mockStore,
        [photos[1]]
      );

      expect(photoService.addPhotos).toHaveBeenCalledTimes(2);
    });

    it('should use mainPhoto parameter when photos array is empty/undefined', async () => {
      const mainPhoto = {
        buffer: Buffer.from('main'),
        originalname: 'main.jpg',
        mimetype: 'image/jpeg',
      } as Express.Multer.File;

      storeService.getEntityById.mockResolvedValue(mockStore);
      productRepo.createEntity!.mockResolvedValue(mockProduct);
      productRepo.findOneBy!.mockResolvedValue(mockProduct);
      photoService.addPhotos!.mockResolvedValue([{ id: 'ph1' }] as any);

      // With undefined photos array
      await service.create(dto, undefined, mainPhoto);

      expect(photoService.addPhotos).not.toHaveBeenCalled();

      jest.clearAllMocks();

      // With empty photos array
      await service.create(dto, [], mainPhoto);

      expect(photoService.addPhotos).not.toHaveBeenCalled();
    });

    it('should use mainPhoto as fallback when photos array has items', async () => {
      const photos = [
        {
          buffer: Buffer.from('1'),
          originalname: 'photo1.jpg',
          mimetype: 'image/jpeg',
        },
      ] as Express.Multer.File[];

      const mainPhoto = {
        buffer: Buffer.from('main'),
        originalname: 'main.jpg',
        mimetype: 'image/jpeg',
      } as Express.Multer.File;

      storeService.getEntityById.mockResolvedValue(mockStore);
      productRepo.createEntity!.mockResolvedValue(mockProduct);
      productRepo.findOneBy!.mockResolvedValue(mockProduct);
      photoService.addPhotos!.mockResolvedValue([{ id: 'ph1' }] as any);

      await service.create(dto, photos, mainPhoto);

      // First photo from array should be used
      expect(photoService.addPhotos).toHaveBeenCalledWith(
        mockProduct,
        mockStore,
        expect.arrayContaining([photos[0]]),
        true
      );
    });
  });

  describe('addPhotos', () => {
    it('should return null when no photos provided', async () => {
      const result = await service.addPhotos('p1', 's1', []);

      expect(result).toBeNull();
      expect(productRepo.findOneBy).not.toHaveBeenCalled();
    });

    it('should throw when product not found', async () => {
      const photos = [{ buffer: Buffer.from('test') } as Express.Multer.File];
      productRepo.findOneBy!.mockResolvedValue(null);

      await expect(
        service.addPhotos('nonexistent', 's1', photos)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw when store not found', async () => {
      const photos = [{ buffer: Buffer.from('test') } as Express.Multer.File];
      productRepo.findOneBy!.mockResolvedValue(mockProduct);
      storeService.getEntityById.mockResolvedValue(null);

      await expect(
        service.addPhotos('p1', 'nonexistent', photos)
      ).rejects.toThrow(NotFoundException);
    });

    it('should add photos to product', async () => {
      const photos = [{ buffer: Buffer.from('test') } as Express.Multer.File];
      const savedPhotos = [{ id: 'ph1', url: 'photo.jpg' }];

      productRepo.findOneBy!.mockResolvedValue(mockProduct);
      storeService.getEntityById.mockResolvedValue(mockStore);
      photoService.addPhotos!.mockResolvedValue(savedPhotos as any);

      const result = await service.addPhotos('p1', 's1', photos);

      expect(result).toEqual(savedPhotos);
      expect(photoService.addPhotos).toHaveBeenCalledWith(
        mockProduct,
        mockStore,
        photos
      );
    });
  });

  describe('addMainPhoto', () => {
    it('should add main photo', async () => {
      const photo = { buffer: Buffer.from('main') } as Express.Multer.File;
      const savedPhoto = { id: 'ph1', isMain: true };

      productRepo.findOneBy!.mockResolvedValue(mockProduct);
      storeService.getEntityById.mockResolvedValue(mockStore);
      photoService.addPhotos!.mockResolvedValue([savedPhoto] as any);

      await service.addMainPhoto('p1', 's1', [photo]);

      expect(photoService.addPhotos).toHaveBeenCalledWith(
        mockProduct,
        mockStore,
        [photo],
        true
      );
    });

    it('should throw when product not found', async () => {
      const photo = { buffer: Buffer.from('test') } as Express.Multer.File;
      productRepo.findOneBy!.mockResolvedValue(null);

      await expect(
        service.addMainPhoto('nonexistent', 's1', [photo])
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removePhoto', () => {
    it('should delegate to photo service', async () => {
      photoService.deletePhotoAndFile!.mockResolvedValue(undefined);

      await service.removePhoto('ph1');

      expect(photoService.deletePhotoAndFile).toHaveBeenCalledWith('ph1');
    });
  });

  describe('findProductsByCategory', () => {
    it('should find products by category', async () => {
      productRepo.findProductsByCategory!.mockResolvedValue([mockProduct]);

      const result = await service.findProductsByCategory('c1', 's1');

      expect(result).toEqual([mockProduct]);
      expect(productRepo.findProductsByCategory).toHaveBeenCalledWith(
        'c1',
        's1'
      );
    });

    it('should work without store filter', async () => {
      productRepo.findProductsByCategory!.mockResolvedValue([mockProduct]);

      await service.findProductsByCategory('c1');

      expect(productRepo.findProductsByCategory).toHaveBeenCalledWith(
        'c1',
        undefined
      );
    });
  });

  describe('attachCategoryToProduct', () => {
    it('should attach category to product', async () => {
      const category = { id: 'c1', name: 'Category' };
      productRepo.findOne!.mockResolvedValue(mockProduct);
      categoriesService.findOne!.mockResolvedValue(category as any);
      productRepo.save!.mockResolvedValue(mockProduct);

      const result = await service.attachCategoryToProduct('p1', 'c1');

      expect(productRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'p1' },
        relations: ['categories', 'store'],
      });
      expect(categoriesService.findOne).toHaveBeenCalledWith('c1');
      expect(result).toEqual(mockProduct);
    });

    it('should throw when product not found', async () => {
      productRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.attachCategoryToProduct('nonexistent', 'c1')
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw when category not found', async () => {
      productRepo.findOne!.mockResolvedValue(mockProduct);
      categoriesService.findOne!.mockResolvedValue(null as any);

      await expect(
        service.attachCategoryToProduct('p1', 'nonexistent')
      ).rejects.toThrow(NotFoundException);
    });

    it('should not add duplicate category', async () => {
      const category = { id: 'c1', name: 'Category' };
      const productWithCategory = {
        ...mockProduct,
        categories: [category as any],
      };

      productRepo.findOne!.mockResolvedValue(productWithCategory as any);
      categoriesService.findOne!.mockResolvedValue(category as any);
      productRepo.save!.mockResolvedValue(productWithCategory as any);

      await service.attachCategoryToProduct('p1', 'c1');

      expect(productWithCategory.categories).toHaveLength(1);
    });
  });

  describe('getProductStats', () => {
    it('should return product stats', async () => {
      const statsDto = { id: 'p1', viewCount: 100 };
      productRepo.findOne!.mockResolvedValue(mockProduct);
      mapper.toStatsDto!.mockReturnValue(statsDto as any);

      const result = await service.getProductStats('p1');

      expect(result).toEqual(statsDto);
      expect(mapper.toStatsDto).toHaveBeenCalledWith(mockProduct);
    });

    it('should throw when product not found', async () => {
      productRepo.findOne!.mockResolvedValue(null);

      await expect(service.getProductStats('nonexistent')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('incrementViewCount', () => {
    it('should increment view count', async () => {
      productRepo.increment!.mockResolvedValue(undefined as any);

      await service.incrementViewCount('p1');

      expect(productRepo.increment).toHaveBeenCalledWith(
        { id: 'p1' },
        'viewCount',
        1
      );
    });
  });

  describe('recalculateProductStats', () => {
    it('should recalculate product stats', async () => {
      productRepo.recalculateStats!.mockResolvedValue(undefined);

      await service.recalculateProductStats('p1');

      expect(productRepo.recalculateStats).toHaveBeenCalledWith('p1');
    });
  });

  describe('searchProducts', () => {
    it('should throw when query is empty', async () => {
      await expect(service.searchProducts('s1', '')).rejects.toThrow(
        BadRequestException
      );
      await expect(service.searchProducts('s1', '   ')).rejects.toThrow(
        'Search query is required'
      );
    });

    it('should search products', async () => {
      const searchResults = [
        {
          id: 'p1',
          name: 'Gaming Laptop',
          description: 'High performance',
          averageRating: '4.5',
          reviewCount: 10,
          mainPhotoUrl: 'photo.jpg',
          minPrice: '1000',
        },
      ];

      productSearchRepo.searchProducts!.mockResolvedValue(searchResults as any);

      const result = await service.searchProducts('s1', 'gaming laptop', 20);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Gaming Laptop');
      expect(productSearchRepo.searchProducts).toHaveBeenCalledWith(
        's1',
        'gaming laptop',
        20,
        ['gaming', 'laptop'],
        undefined
      );
    });
  });

  describe('softDelete', () => {
    it('should soft delete product', async () => {
      productRepo.softDelete!.mockResolvedValue(undefined as any);

      await service.softDelete('p1');

      expect(productRepo.softDelete).toHaveBeenCalledWith('p1');
    });
  });

  describe('removeCategoryFromProduct', () => {
    it('should remove category from product', async () => {
      const category1 = { id: 'c1', name: 'Cat1' };
      const category2 = { id: 'c2', name: 'Cat2' };
      const productWithCategories = {
        ...mockProduct,
        categories: [category1, category2],
      };

      productRepo.findOne!.mockResolvedValue(productWithCategories as any);
      productRepo.save!.mockResolvedValue(mockProduct);

      await service.removeCategoryFromProduct('p1', 'c1');

      expect(productRepo.save).toHaveBeenCalled();
      const savedProduct = (productRepo.save as jest.Mock).mock.calls[0][0];
      expect(savedProduct.categories).toHaveLength(1);
      expect(savedProduct.categories[0].id).toBe('c2');
    });

    it('should throw when product not found', async () => {
      productRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.removeCategoryFromProduct('nonexistent', 'c1')
      ).rejects.toThrow(NotFoundException);
    });
  });
});
