import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from 'src/modules/products/services/products.service';
import { BadRequestException } from '@nestjs/common';
import {
  createGuardMock,
  createMockAnalyticsQueue,
  createMockInterceptor,
  createPolicyMock,
  createServiceMock,
  MockedMethods,
} from 'test/unit/helpers';
import { ProductsController } from 'src/modules/products/controllers/products.controller';
import { PolicyService } from 'src/modules/authorization/policy/policy.service';
import { JwtAuthGuard } from 'src/modules/authorization/guards/jwt-auth.guard';
import { StoreRolesGuard } from 'src/modules/authorization/guards/store-roles.guard';
import {AnalyticsQueueService} from "src/modules/infrastructure/queues/analytics-queue/analytics-queue.service";
import {RecordEventInterceptor} from "src/modules/infrastructure/interceptors/record-event/record-event.interceptor";
import {
  ProductPhotosInterceptor
} from "src/modules/infrastructure/interceptors/product-photo/product-photo.interceptor";

describe('ProductsController', () => {
  let controller: ProductsController;
  let service: Partial<MockedMethods<ProductsService>>;

  beforeEach(async () => {
    service = createServiceMock<ProductsService>([
      'findAllByStoreAsList',
      'searchProducts',
      'advancedProductSearch',
      'autocompleteProducts',
      'findProductDetail',
      'getProductStats',
      'create',
      'softDelete',
      'addPhotos',
      'addMainPhoto',
      'removePhoto',
      'findProductsByCategory',
      'attachCategoryToProduct',
      'removeCategoryFromProduct',
      'recalculateProductStats',
      'incrementViewCount',
    ]);
    const policyMock = createPolicyMock();
    const guardMock = createGuardMock();
    const queueMock = createMockAnalyticsQueue();
    const interceptorMock = createMockInterceptor();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        { provide: AnalyticsQueueService, useValue: queueMock },
        { provide: ProductsService, useValue: service },
        { provide: PolicyService, useValue: policyMock },
        { provide: JwtAuthGuard, useValue: guardMock },
        { provide: StoreRolesGuard, useValue: guardMock },
        { provide: RecordEventInterceptor, useValue: interceptorMock },
        { provide: ProductPhotosInterceptor, useValue: interceptorMock },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
    jest.clearAllMocks();
  });

  describe('findAllProducts', () => {
    it('should return all products for a store', async () => {
      const products = [{ id: 'p1', name: 'Product 1' }];
      service.findAllByStoreAsList!.mockResolvedValue(products as any);

      const result = await controller.findAllProducts('s1');

      expect(result).toEqual(products);
      expect(service.findAllByStoreAsList).toHaveBeenCalledWith('s1');
    });
  });

  describe('searchProducts', () => {
    it('should search products', async () => {
      const results = [{ id: 'p1', name: 'Gaming Laptop' }];
      service.searchProducts!.mockResolvedValue(results as any);

      const result = await controller.searchProducts(
        's1',
        'gaming',
        '20',
        'relevance'
      );

      expect(result).toEqual(results);
      expect(service.searchProducts).toHaveBeenCalledWith('s1', 'gaming', 20, {
        sortBy: 'relevance',
      });
    });

    it('should apply limit cap', async () => {
      service.searchProducts!.mockResolvedValue([]);

      await controller.searchProducts('s1', 'test', '100');

      expect(service.searchProducts).toHaveBeenCalledWith('s1', 'test', 50, {
        sortBy: undefined,
      });
    });
  });

  describe('advancedSearch', () => {
    it('should perform advanced search', async () => {
      const searchDto = {
        query: 'laptop',
        minPrice: 500,
        maxPrice: 2000,
        limit: 20,
        offset: 0,
      };
      const result = { products: [{ id: 'p1' }], total: 15 };

      service.advancedProductSearch!.mockResolvedValue(result as any);

      const response = await controller.advancedSearch('s1', searchDto as any);

      expect(response).toEqual({
        products: result.products,
        total: 15,
        page: 1,
        limit: 20,
      });
    });

    it('should calculate page number correctly', async () => {
      const searchDto = { limit: 20, offset: 60 };
      service.advancedProductSearch!.mockResolvedValue({
        products: [],
        total: 100,
      } as any);

      const response = await controller.advancedSearch('s1', searchDto as any);

      expect(response.page).toBe(4);
    });
  });

  describe('autocomplete', () => {
    it('should return autocomplete suggestions', async () => {
      const suggestions = [{ id: 'p1', name: 'Laptop', minPrice: 1000 }];
      service.autocompleteProducts!.mockResolvedValue(suggestions as any);

      const result = await controller.autocomplete('s1', 'lap', '10');

      expect(result).toEqual(suggestions);
    });

    it('should return empty for short queries', async () => {
      const result = await controller.autocomplete('s1', 'l');

      expect(result).toEqual([]);
    });
  });

  describe('findOneProduct', () => {
    it('should return product detail', async () => {
      const detail = { id: 'p1', name: 'Product', variants: [] };
      service.findProductDetail!.mockResolvedValue(detail as any);

      const result = await controller.findOneProduct('s1', 'p1');

      expect(result).toEqual(detail);
    });
  });

  describe('getProductStats', () => {
    it('should return product stats', async () => {
      const stats = { id: 'p1', viewCount: 100 };
      service.getProductStats!.mockResolvedValue(stats as any);

      const result = await controller.getProductStats('s1', 'p1');

      expect(result).toEqual(stats);
    });
  });

  describe('createProduct', () => {
    it('should throw when name is missing', async () => {
      await expect(controller.createProduct('s1', {} as any)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should create product with photos', async () => {
      const dto = { name: 'Product', storeId: 's1' };
      const photos = [{ buffer: Buffer.from('test') } as Express.Multer.File];
      const created = { id: 'p1', name: 'Product' };

      service.create!.mockResolvedValue(created as any);

      await controller.createProduct('s1', dto as any, photos);

      expect(service.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Product', storeId: 's1' }),
        photos,
        undefined
      );
    });
  });

  describe('deleteProduct', () => {
    it('should soft delete product', async () => {
      service.softDelete!.mockResolvedValue(undefined);

      const result = await controller.deleteProduct('s1', 'p1');

      expect(result).toEqual({ success: true });
      expect(service.softDelete).toHaveBeenCalledWith('p1');
    });
  });

  describe('addPhotosToProduct', () => {
    it('should throw when no photos uploaded', async () => {
      await expect(
        controller.addPhotosToProduct('s1', 'p1', [])
      ).rejects.toThrow(BadRequestException);
    });

    it('should add photos to product', async () => {
      const photos = [{ buffer: Buffer.from('test') } as Express.Multer.File];
      const savedPhotos = [{ id: 'ph1' }];

      service.addPhotos!.mockResolvedValue(savedPhotos as any);

      await controller.addPhotosToProduct('s1', 'p1', photos);

      expect(service.addPhotos).toHaveBeenCalledWith('p1', 's1', photos);
    });
  });

  describe('addMainPhotoToProduct', () => {
    it('should throw when no photo uploaded', async () => {
      await expect(
        controller.addMainPhotoToProduct('s1', 'p1', undefined as any)
      ).rejects.toThrow(BadRequestException);
    });

    it('should add main photo', async () => {
      const photo = { buffer: Buffer.from('test') } as Express.Multer.File;
      service.addMainPhoto!.mockResolvedValue([{ id: 'ph1' }] as any);

      await controller.addMainPhotoToProduct('s1', 'p1', photo);

      expect(service.addMainPhoto).toHaveBeenCalledWith('p1', 's1', photo);
    });
  });

  describe('deletePhoto', () => {
    it('should delete photo', async () => {
      service.removePhoto!.mockResolvedValue(undefined);

      const result = await controller.deletePhoto('s1', 'p1', 'ph1');

      expect(result).toEqual({ success: true });
      expect(service.removePhoto).toHaveBeenCalledWith('ph1');
    });
  });

  describe('category management', () => {
    it('should find products by category', async () => {
      const products = [{ id: 'p1' }];
      service.findProductsByCategory!.mockResolvedValue(products as any);

      const result = await controller.findProductsByCategory('s1', 'c1');

      expect(result).toEqual(products);
    });

    it('should assign category to product', async () => {
      const product = { id: 'p1', categories: [{ id: 'c1' }] };
      service.attachCategoryToProduct!.mockResolvedValue(product as any);

      await controller.assignCategoryToProduct('s1', 'p1', 'c1');

      expect(service.attachCategoryToProduct).toHaveBeenCalledWith('p1', 'c1');
    });

    it('should remove category from product', async () => {
      service.removeCategoryFromProduct!.mockResolvedValue(undefined);

      const result = await controller.removeCategoryFromProduct(
        's1',
        'p1',
        'c1'
      );

      expect(result).toEqual({ success: true });
    });
  });

  describe('admin operations', () => {
    it('should recalculate stats', async () => {
      service.recalculateProductStats!.mockResolvedValue(undefined);

      const result = await controller.recalculateStats('s1', 'p1');

      expect(result).toMatchObject({
        success: true,
        productId: 'p1',
      });
    });

    it('should increment view count', async () => {
      service.incrementViewCount!.mockResolvedValue(undefined);

      const result = await controller.incrementViewCount('s1', 'p1');

      expect(result).toMatchObject({
        success: true,
        productId: 'p1',
      });
    });
  });
});
