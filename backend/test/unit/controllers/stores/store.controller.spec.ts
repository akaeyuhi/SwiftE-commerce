import { Test, TestingModule } from '@nestjs/testing';
import { StoreController } from 'src/modules/store/store.controller';
import { StoreService } from 'src/modules/store/store.service';
import { BadRequestException } from '@nestjs/common';
import {
  createGuardMock,
  createPolicyMock,
  createServiceMock,
  MockedMethods,
} from 'test/utils/helpers';
import { PolicyService } from 'src/modules/authorization/policy/policy.service';
import { JwtAuthGuard } from 'src/modules/authorization/guards/jwt-auth.guard';
import { AdminGuard } from 'src/modules/authorization/guards/admin.guard';
import { StoreRolesGuard } from 'src/modules/authorization/guards/store-roles.guard';
import { EntityOwnerGuard } from 'src/modules/authorization/guards/entity-owner.guard';

describe('StoreController', () => {
  let controller: StoreController;
  let service: Partial<MockedMethods<StoreService>>;

  beforeEach(async () => {
    service = createServiceMock<StoreService>([
      'findAllWithStats',
      'searchStoresByName',
      'advancedStoreSearch',
      'autocompleteStores',
      'getStoreStats',
      'getTopStoresByRevenue',
      'getTopStoresByProducts',
      'getTopStoresByFollowers',
      'recalculateStoreStats',
      'recalculateAllStoreStats',
      'checkStoreDataHealth',
    ]);

    const policyMock = createPolicyMock();
    const guardMock = createGuardMock();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StoreController],
      providers: [
        { provide: StoreService, useValue: service },
        { provide: PolicyService, useValue: policyMock },
        { provide: JwtAuthGuard, useValue: guardMock },
        { provide: AdminGuard, useValue: guardMock },
        { provide: StoreRolesGuard, useValue: guardMock },
        { provide: EntityOwnerGuard, useValue: guardMock },
      ],
    }).compile();

    controller = module.get<StoreController>(StoreController);
    jest.clearAllMocks();
  });

  describe('findAllStores', () => {
    it('should return all stores with stats', async () => {
      const stores = [{ id: 's1', name: 'Store 1' }];
      service.findAllWithStats!.mockResolvedValue(stores as any);

      const result = await controller.findAllStores();

      expect(result).toEqual(stores);
      expect(service.findAllWithStats).toHaveBeenCalled();
    });

    it('should throw BadRequestException on error', async () => {
      service.findAllWithStats!.mockRejectedValue(new Error('DB error'));

      await expect(controller.findAllStores()).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('searchStores', () => {
    it('should search stores by query', async () => {
      const results = [{ id: 's1', name: 'Gaming Store' }];
      service.searchStoresByName!.mockResolvedValue(results as any);

      const result = await controller.searchStores('gaming', '20');

      expect(result).toEqual(results);
      expect(service.searchStoresByName).toHaveBeenCalledWith('gaming', 20, {
        sortBy: undefined,
      });
    });

    it('should throw when query is empty', async () => {
      await expect(controller.searchStores('')).rejects.toThrow(
        BadRequestException
      );
      await expect(controller.searchStores('   ')).rejects.toThrow(
        'Search query is required'
      );
    });

    it('should apply limit cap at 50', async () => {
      service.searchStoresByName!.mockResolvedValue([]);

      await controller.searchStores('test', '100');

      expect(service.searchStoresByName).toHaveBeenCalledWith('test', 50, {
        sortBy: undefined,
      });
    });

    it('should use default limit of 20', async () => {
      service.searchStoresByName!.mockResolvedValue([]);

      await controller.searchStores('test');

      expect(service.searchStoresByName).toHaveBeenCalledWith('test', 20, {
        sortBy: undefined,
      });
    });

    it('should pass sortBy option', async () => {
      service.searchStoresByName!.mockResolvedValue([]);

      await controller.searchStores('test', undefined, 'revenue');

      expect(service.searchStoresByName).toHaveBeenCalledWith('test', 20, {
        sortBy: 'revenue',
      });
    });
  });

  describe('advancedSearch', () => {
    it('should perform advanced search', async () => {
      const searchDto = {
        query: 'tech',
        minRevenue: 1000,
        limit: 20,
        offset: 0,
      };
      const result = { stores: [{ id: 's1' }], total: 5 };

      service.advancedStoreSearch!.mockResolvedValue(result as any);

      const response = await controller.advancedSearch(searchDto as any);

      expect(response).toEqual({
        stores: result.stores,
        total: 5,
        page: 1,
        limit: 20,
      });
    });

    it('should calculate page number', async () => {
      const searchDto = { limit: 20, offset: 40 };
      service.advancedStoreSearch!.mockResolvedValue({
        stores: [],
        total: 100,
      } as any);

      const response = await controller.advancedSearch(searchDto as any);

      expect(response.page).toBe(3); // (40 / 20) + 1
    });
  });

  describe('autocomplete', () => {
    it('should return autocomplete suggestions', async () => {
      const suggestions = [
        { id: 's1', name: 'Tech Store', followerCount: 100 },
      ];
      service.autocompleteStores!.mockResolvedValue(suggestions as any);

      const result = await controller.autocomplete('tech', '10');

      expect(result).toEqual(suggestions);
      expect(service.autocompleteStores).toHaveBeenCalledWith('tech', 10);
    });

    it('should return empty array for short queries', async () => {
      const result = await controller.autocomplete('t');

      expect(result).toEqual([]);
      expect(service.autocompleteStores).not.toHaveBeenCalled();
    });

    it('should apply limit cap at 20', async () => {
      service.autocompleteStores!.mockResolvedValue([]);

      await controller.autocomplete('tech', '50');

      expect(service.autocompleteStores).toHaveBeenCalledWith('tech', 20);
    });
  });

  describe('getStoreStats', () => {
    it('should return store stats', async () => {
      const stats = { id: 's1', productCount: 10 };
      service.getStoreStats!.mockResolvedValue(stats as any);

      const result = await controller.getStoreStats('s1');

      expect(result).toEqual(stats);
      expect(service.getStoreStats).toHaveBeenCalledWith('s1');
    });
  });

  describe('getTopStoresByRevenue', () => {
    it('should return top stores by revenue', async () => {
      const stores = [{ id: 's1', totalRevenue: 10000 }];
      service.getTopStoresByRevenue!.mockResolvedValue(stores as any);

      const result = await controller.getTopStoresByRevenue('15');

      expect(result).toEqual(stores);
      expect(service.getTopStoresByRevenue).toHaveBeenCalledWith(15);
    });

    it('should apply limit cap', async () => {
      service.getTopStoresByRevenue!.mockResolvedValue([]);

      await controller.getTopStoresByRevenue('100');

      expect(service.getTopStoresByRevenue).toHaveBeenCalledWith(50);
    });
  });

  describe('recalculateStats', () => {
    it('should recalculate store stats', async () => {
      service.recalculateStoreStats!.mockResolvedValue(undefined);

      const result = await controller.recalculateStats('s1');

      expect(result).toEqual({
        success: true,
        message: 'Store statistics recalculated successfully',
        storeId: 's1',
      });
    });
  });

  describe('checkStoreHealth', () => {
    it('should check store health', async () => {
      const health = { storeId: 's1', health: {}, needsRecalculation: false };
      service.checkStoreDataHealth!.mockResolvedValue(health as any);

      const result = await controller.checkStoreHealth('s1');

      expect(result).toEqual(health);
    });
  });
});
