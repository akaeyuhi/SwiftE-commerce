import { Test, TestingModule } from '@nestjs/testing';
import { ProductsRankingController } from 'src/modules/products/controllers/products-ranking.controller';
import { ProductsRankingService } from 'src/modules/products/services/product-ranking.service';
import { BadRequestException } from '@nestjs/common';
import { createMock, MockedMethods } from 'test/utils/helpers';

describe('ProductsRankingController', () => {
  let controller: ProductsRankingController;
  let service: Partial<MockedMethods<ProductsRankingService>>;

  beforeEach(async () => {
    service = createMock<ProductsRankingService>([
      'getTopProductsByViews',
      'getTopProductsBySales',
      'getTopRatedProducts',
      'getTopProductsByConversionRate',
      'getTrendingProducts',
    ]);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsRankingController],
      providers: [{ provide: ProductsRankingService, useValue: service }],
    }).compile();

    controller = module.get<ProductsRankingController>(
      ProductsRankingController
    );
    jest.clearAllMocks();
  });

  describe('getTopProductsByViews', () => {
    it('should return top products by views', async () => {
      const products = [{ id: 'p1', viewCount: 1000 }];
      service.getTopProductsByViews!.mockResolvedValue(products as any);

      const result = await controller.getTopProductsByViews('s1', '15');

      expect(result).toEqual(products);
      expect(service.getTopProductsByViews).toHaveBeenCalledWith('s1', 15);
    });

    it('should apply limit cap', async () => {
      service.getTopProductsByViews!.mockResolvedValue([]);

      await controller.getTopProductsByViews('s1', '100');

      expect(service.getTopProductsByViews).toHaveBeenCalledWith('s1', 50);
    });

    it('should use default limit', async () => {
      service.getTopProductsByViews!.mockResolvedValue([]);

      await controller.getTopProductsByViews('s1');

      expect(service.getTopProductsByViews).toHaveBeenCalledWith('s1', 10);
    });
  });

  describe('getTopProductsBySales', () => {
    it('should return top products by sales', async () => {
      const products = [{ id: 'p1', totalSales: 500 }];
      service.getTopProductsBySales!.mockResolvedValue(products as any);

      const result = await controller.getTopProductsBySales('s1', '20');

      expect(result).toEqual(products);
      expect(service.getTopProductsBySales).toHaveBeenCalledWith('s1', 20);
    });
  });

  describe('getTopRatedProducts', () => {
    it('should return top rated products', async () => {
      const products = [{ id: 'p1', averageRating: 4.8 }];
      service.getTopRatedProducts!.mockResolvedValue(products as any);

      const result = await controller.getTopRatedProducts('s1', '25');

      expect(result).toEqual(products);
      expect(service.getTopRatedProducts).toHaveBeenCalledWith('s1', 25);
    });
  });

  describe('getTopProductsByConversion', () => {
    it('should return top products by conversion rate', async () => {
      const products = [{ id: 'p1', conversionRate: 0.2 }];
      service.getTopProductsByConversionRate!.mockResolvedValue(
        products as any
      );

      const result = await controller.getTopProductsByConversion('s1', '10');

      expect(result).toEqual(products);
      expect(service.getTopProductsByConversionRate).toHaveBeenCalledWith(
        's1',
        10
      );
    });
  });

  describe('getTrendingProducts', () => {
    it('should return trending products', async () => {
      const products = [{ id: 'p1', trendingScore: 150 }];
      service.getTrendingProducts!.mockResolvedValue(products as any);

      const result = await controller.getTrendingProducts('s1', '15', '7');

      expect(result).toEqual(products);
      expect(service.getTrendingProducts).toHaveBeenCalledWith('s1', 15, 7);
    });

    it('should use default days period', async () => {
      service.getTrendingProducts!.mockResolvedValue([]);

      await controller.getTrendingProducts('s1');

      expect(service.getTrendingProducts).toHaveBeenCalledWith('s1', 10, 7);
    });
  });

  describe('error handling', () => {
    it('should wrap service errors in BadRequestException', async () => {
      service.getTopProductsByViews!.mockRejectedValue(
        new Error('Service error')
      );

      await expect(controller.getTopProductsByViews('s1')).rejects.toThrow(
        BadRequestException
      );
    });
  });
});
