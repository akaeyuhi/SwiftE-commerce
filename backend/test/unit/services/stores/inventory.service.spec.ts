import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from 'src/modules/store/inventory/inventory.service';
import { InventoryRepository } from 'src/modules/store/inventory/inventory.repository';
import { Inventory } from 'src/entities/store/product/inventory.entity';
import {
  createRepositoryMock,
  createMock,
  MockedMethods,
} from '../../../utils/helpers';
import { NotFoundException, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InventoryThresholdsConfig } from 'src/modules/store/inventory/config/inventory-thresholds.config';
import {
  LowStockEvent,
  OutOfStockEvent,
} from 'src/common/events/inventory/low-stock.event';
import { ProductVariant } from 'src/entities/store/product/variant.entity';
import { Product } from 'src/entities/store/product/product.entity';
import { Store } from 'src/entities/store/store.entity';

describe('InventoryService', () => {
  let service: InventoryService;
  let repo: Partial<MockedMethods<InventoryRepository>>;
  let eventEmitter: Partial<MockedMethods<EventEmitter2>>;
  let thresholdsConfig: Partial<MockedMethods<InventoryThresholdsConfig>>;

  const mockStore: Store = {
    id: 's1',
    name: 'Test Store',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Store;

  const mockProduct: Product = {
    id: 'p1',
    name: 'Test Product',
    store: mockStore,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Product;

  const mockVariant: ProductVariant = {
    id: 'v1',
    sku: 'TEST-SKU-001',
    product: mockProduct,
    price: 50.0,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as ProductVariant;

  const mockInventory: Inventory = {
    id: 'inv1',
    variant: mockVariant,
    store: mockStore,
    quantity: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Inventory;

  beforeEach(async () => {
    repo = createRepositoryMock<InventoryRepository>([
      'findOne',
      'findById',
      'save',
      'create',
      'update',
      'delete',
    ]);

    eventEmitter = createMock<EventEmitter2>(['emit']);

    thresholdsConfig = createMock<InventoryThresholdsConfig>([
      'isOutOfStock',
      'isCriticalStock',
      'isLowStock',
      'getLowStockThreshold',
      'getCriticalThreshold',
      'getLowStockThreshold',
    ]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: InventoryRepository, useValue: repo },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: InventoryThresholdsConfig, useValue: thresholdsConfig },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);

    // Suppress logger output in tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should extend BaseService', () => {
      expect(service).toBeInstanceOf(InventoryService);
      expect(typeof service.create).toBe('function');
      expect(typeof service.findOne).toBe('function');
    });
  });

  describe('update', () => {
    it('should update inventory quantity', async () => {
      const inventory = { ...mockInventory, quantity: 100 };
      const updateDto = { quantity: 90 };

      repo.findOne!.mockResolvedValue(inventory);
      repo.save!.mockResolvedValue({ ...inventory, quantity: 90 });

      // Mock thresholds to not trigger events
      thresholdsConfig.isOutOfStock!.mockReturnValue(false);
      thresholdsConfig.isCriticalStock!.mockReturnValue(false);
      thresholdsConfig.isLowStock!.mockReturnValue(false);

      const result = await service.update('inv1', updateDto);

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: 'inv1' },
        relations: ['variant', 'variant.product', 'store'],
      });
      expect(result.quantity).toBe(90);
      expect(repo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when inventory not found', async () => {
      repo.findOne!.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { quantity: 50 })
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.update('nonexistent', { quantity: 50 })
      ).rejects.toThrow('Inventory not found');
    });

    it('should emit out-of-stock event when crossing zero threshold', async () => {
      const inventory = { ...mockInventory, quantity: 5 };
      const updateDto = { quantity: 0 };

      repo.findOne!.mockResolvedValue(inventory);
      repo.save!.mockResolvedValue({ ...inventory, quantity: 0 });

      thresholdsConfig.isOutOfStock!.mockImplementation((qty) => qty === 0);
      thresholdsConfig.getLowStockThreshold!.mockReturnValue(10);
      eventEmitter.emit!.mockReturnValue(true);

      await service.update('inv1', updateDto);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'inventory.out-of-stock',
        expect.any(OutOfStockEvent)
      );

      const emitCall = (eventEmitter.emit as jest.Mock).mock.calls[0];
      const event = emitCall[1] as OutOfStockEvent;
      expect(event.variantId).toBe('v1');
      expect(event.sku).toBe('TEST-SKU-001');
      expect(event.productName).toBe('Test Product');
    });

    it('should emit low-stock event when crossing low threshold', async () => {
      const inventory = { ...mockInventory, quantity: 15 };
      const updateDto = { quantity: 8 };

      repo.findOne!.mockResolvedValue(inventory);
      repo.save!.mockResolvedValue({ ...inventory, quantity: 8 });

      thresholdsConfig.isOutOfStock!.mockReturnValue(false);
      thresholdsConfig.isCriticalStock!.mockReturnValue(false);
      thresholdsConfig.isLowStock!.mockImplementation((qty) => qty < 10);
      thresholdsConfig.getLowStockThreshold!.mockReturnValue(10);
      eventEmitter.emit!.mockReturnValue(true);

      // Mock calculateRecentSales
      jest.spyOn(service as any, 'calculateRecentSales').mockResolvedValue(14);

      await service.update('inv1', updateDto);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'inventory.low-stock',
        expect.any(LowStockEvent)
      );

      const emitCall = (eventEmitter.emit as jest.Mock).mock.calls[0];
      const event = emitCall[1] as LowStockEvent;
      expect(event.currentStock).toBe(8);
      expect(event.threshold).toBe(10);
    });

    it('should emit critical low-stock event', async () => {
      const inventory = { ...mockInventory, quantity: 10 };
      const updateDto = { quantity: 3 };

      repo.findOne!.mockResolvedValue(inventory);
      repo.save!.mockResolvedValue({ ...inventory, quantity: 3 });

      thresholdsConfig.isOutOfStock!.mockReturnValue(false);
      thresholdsConfig.isCriticalStock!.mockImplementation(
        (qty) => qty > 0 && qty <= 5
      );
      thresholdsConfig.isLowStock!.mockImplementation((qty) => qty < 10);
      thresholdsConfig.getLowStockThreshold!.mockReturnValue(10);
      eventEmitter.emit!.mockReturnValue(true);

      jest.spyOn(service as any, 'calculateRecentSales').mockResolvedValue(7);

      await service.update('inv1', updateDto);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'inventory.low-stock',
        expect.any(LowStockEvent)
      );
    });

    it('should not emit events when quantity increases', async () => {
      const inventory = { ...mockInventory, quantity: 5 };
      const updateDto = { quantity: 20 };

      repo.findOne!.mockResolvedValue(inventory);
      repo.save!.mockResolvedValue({ ...inventory, quantity: 20 });

      await service.update('inv1', updateDto);

      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('should not emit events when quantity stays the same', async () => {
      const inventory = { ...mockInventory, quantity: 50 };
      const updateDto = { quantity: 50 };

      repo.findOne!.mockResolvedValue(inventory);
      repo.save!.mockResolvedValue(inventory);

      await service.update('inv1', updateDto);

      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('should not re-emit event if already below threshold', async () => {
      const inventory = { ...mockInventory, quantity: 5 };
      const updateDto = { quantity: 3 };

      repo.findOne!.mockResolvedValue(inventory);
      repo.save!.mockResolvedValue({ ...inventory, quantity: 3 });

      thresholdsConfig.isOutOfStock!.mockReturnValue(false);
      thresholdsConfig.isCriticalStock!.mockImplementation((qty) => qty <= 5);
      thresholdsConfig.isLowStock!.mockReturnValue(true);

      await service.update('inv1', updateDto);

      // Should not emit because was already critical
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('getQuantity', () => {
    it('should return quantity when inventory exists', async () => {
      repo.findOne!.mockResolvedValue(mockInventory);

      const result = await service.getQuantity('v1');

      expect(result).toBe(100);
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { variant: { id: 'v1' } },
      });
    });

    it('should return 0 when inventory not found', async () => {
      repo.findOne!.mockResolvedValue(null);

      const result = await service.getQuantity('v1');

      expect(result).toBe(0);
    });
  });

  describe('adjust', () => {
    it('should adjust inventory by positive delta', async () => {
      const inventory = { ...mockInventory, quantity: 100 };

      repo.findOne!.mockResolvedValue(inventory);
      repo.save!.mockResolvedValue({ ...inventory, quantity: 110 });

      const result = await service.adjust('v1', 10);

      expect(inventory.quantity).toBe(110);
      expect(result.quantity).toBe(110);
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { variant: { id: 'v1' } },
        lock: { mode: 'pessimistic_write' },
      });
    });

    it('should adjust inventory by negative delta', async () => {
      const inventory = { ...mockInventory, quantity: 100 };

      repo.findOne!.mockResolvedValue(inventory);
      repo.save!.mockResolvedValue({ ...inventory, quantity: 95 });

      const result = await service.adjust('v1', -5);

      expect(inventory.quantity).toBe(95);
      expect(result.quantity).toBe(95);
    });

    it('should throw NotFoundException when inventory not found', async () => {
      repo.findOne!.mockResolvedValue(null);

      await expect(service.adjust('v1', 10)).rejects.toThrow(NotFoundException);
      await expect(service.adjust('v1', 10)).rejects.toThrow(
        'Inventory not found'
      );
    });

    it('should throw Error when adjustment results in negative stock', async () => {
      const inventory = { ...mockInventory, quantity: 5 };
      repo.findOne!.mockResolvedValue(inventory);

      await expect(service.adjust('v1', -10)).rejects.toThrow(
        'Insufficient stock'
      );
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('should use pessimistic write lock', async () => {
      repo.findOne!.mockResolvedValue(mockInventory);
      repo.save!.mockResolvedValue(mockInventory);

      await service.adjust('v1', 5);

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { variant: { id: 'v1' } },
        lock: { mode: 'pessimistic_write' },
      });
    });
  });

  describe('set', () => {
    it('should create new inventory record when none exists', async () => {
      const newInventory = {
        variant: { id: 'v1' } as any,
        quantity: 50,
      };

      repo.findOne!.mockResolvedValue(null);
      repo.create!.mockReturnValue(newInventory as any);
      repo.save!.mockResolvedValue({
        id: 'inv2',
        ...newInventory,
      } as any);

      const result = await service.set('v1', 50);

      expect(repo.create).toHaveBeenCalledWith({
        variant: { id: 'v1' },
        quantity: 50,
      });
      expect(repo.save).toHaveBeenCalled();
      expect(result.quantity).toBe(50);
    });

    it('should update existing inventory record', async () => {
      const inventory = { ...mockInventory, quantity: 100 };

      repo.findOne!.mockResolvedValue(inventory);
      repo.save!.mockResolvedValue({ ...inventory, quantity: 150 });

      const result = await service.set('v1', 150);

      expect(inventory.quantity).toBe(150);
      expect(result.quantity).toBe(150);
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('should handle setting inventory to zero', async () => {
      const inventory = { ...mockInventory };

      repo.findOne!.mockResolvedValue(inventory);
      repo.save!.mockResolvedValue({ ...inventory, quantity: 0 });

      const result = await service.set('v1', 0);

      expect(result.quantity).toBe(0);
    });
  });

  describe('adjustInventory', () => {
    it('should adjust inventory by delta', async () => {
      const inventory = { ...mockInventory, quantity: 100 };

      jest
        .spyOn(service, 'findInventoryByVariantId')
        .mockResolvedValue(inventory);
      jest.spyOn(service, 'update').mockResolvedValue({
        ...inventory,
        quantity: 110,
      });

      const result = await service.adjustInventory('v1', 10);

      expect(service.findInventoryByVariantId).toHaveBeenCalledWith('v1');
      expect(service.update).toHaveBeenCalledWith('inv1', { quantity: 110 });
      expect(result.quantity).toBe(110);
    });

    it('should throw NotFoundException when inventory not found', async () => {
      jest.spyOn(service, 'findInventoryByVariantId').mockResolvedValue(null);

      await expect(service.adjustInventory('v1', 10)).rejects.toThrow(
        NotFoundException
      );
      await expect(service.adjustInventory('v1', 10)).rejects.toThrow(
        'Inventory not found for variant v1'
      );
    });

    it('should throw Error when adjustment results in negative stock', async () => {
      const inventory = { ...mockInventory, quantity: 5 };
      jest
        .spyOn(service, 'findInventoryByVariantId')
        .mockResolvedValue(inventory);

      await expect(service.adjustInventory('v1', -10)).rejects.toThrow(
        'Insufficient stock'
      );
    });

    it('should log warning when attempting negative stock', async () => {
      const inventory = { ...mockInventory, quantity: 5 };
      const loggerSpy = jest.spyOn(Logger.prototype, 'warn');

      jest
        .spyOn(service, 'findInventoryByVariantId')
        .mockResolvedValue(inventory);

      await expect(service.adjustInventory('v1', -10)).rejects.toThrow();

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Attempted to set negative inventory')
      );
    });

    it('should handle negative delta correctly', async () => {
      const inventory = { ...mockInventory, quantity: 100 };

      jest
        .spyOn(service, 'findInventoryByVariantId')
        .mockResolvedValue(inventory);
      jest.spyOn(service, 'update').mockResolvedValue({
        ...inventory,
        quantity: 90,
      });

      await service.adjustInventory('v1', -10);

      expect(service.update).toHaveBeenCalledWith('inv1', { quantity: 90 });
    });
  });

  describe('findInventoryByVariantId', () => {
    it('should find inventory with relations', async () => {
      repo.findOne!.mockResolvedValue(mockInventory);

      const result = await service.findInventoryByVariantId('v1');

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { variant: { id: 'v1' } },
        relations: ['variant', 'variant.product', 'store'],
      });
      expect(result).toEqual(mockInventory);
    });

    it('should return null when inventory not found', async () => {
      repo.findOne!.mockResolvedValue(null);

      const result = await service.findInventoryByVariantId('v1');

      expect(result).toBeNull();
    });

    it('should load all required relations', async () => {
      repo.findOne!.mockResolvedValue(mockInventory);

      const result = await service.findInventoryByVariantId('v1');

      expect(result?.variant).toBeDefined();
      expect(result?.variant.product).toBeDefined();
      expect(result?.store).toBeDefined();
    });
  });

  describe('event emission scenarios', () => {
    it('should prioritize out-of-stock over other events', async () => {
      const inventory = { ...mockInventory, quantity: 1 };

      repo.findOne!.mockResolvedValue(inventory);
      repo.save!.mockResolvedValue({ ...inventory, quantity: 0 });

      thresholdsConfig.isOutOfStock!.mockImplementation((qty) => qty === 0);
      thresholdsConfig.isCriticalStock!.mockReturnValue(true);
      thresholdsConfig.isLowStock!.mockReturnValue(true);
      eventEmitter.emit!.mockReturnValue(true);

      await service.update('inv1', { quantity: 0 });

      expect(eventEmitter.emit).toHaveBeenCalledTimes(1);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'inventory.out-of-stock',
        expect.any(OutOfStockEvent)
      );
    });

    it('should prioritize critical low-stock over regular low-stock', async () => {
      const inventory = { ...mockInventory, quantity: 10 };

      repo.findOne!.mockResolvedValue(inventory);
      repo.save!.mockResolvedValue({ ...inventory, quantity: 3 });

      thresholdsConfig.isOutOfStock!.mockReturnValue(false);
      thresholdsConfig.isCriticalStock!.mockImplementation(
        (qty) => qty > 0 && qty <= 5
      );
      thresholdsConfig.isLowStock!.mockReturnValue(true);
      thresholdsConfig.getLowStockThreshold!.mockReturnValue(10);
      eventEmitter.emit!.mockReturnValue(true);

      jest.spyOn(service as any, 'calculateRecentSales').mockResolvedValue(5);

      await service.update('inv1', { quantity: 3 });

      expect(eventEmitter.emit).toHaveBeenCalledTimes(1);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'inventory.low-stock',
        expect.any(LowStockEvent)
      );
    });

    it('should include estimated days in low-stock event', async () => {
      const inventory = { ...mockInventory, quantity: 15 };

      repo.findOne!.mockResolvedValue(inventory);
      repo.save!.mockResolvedValue({ ...inventory, quantity: 8 });

      thresholdsConfig.isOutOfStock!.mockReturnValue(false);
      thresholdsConfig.isCriticalStock!.mockReturnValue(false);
      thresholdsConfig.isLowStock!.mockImplementation((qty) => qty < 10);
      thresholdsConfig.getLowStockThreshold!.mockReturnValue(10);
      eventEmitter.emit!.mockReturnValue(true);

      jest.spyOn(service as any, 'calculateRecentSales').mockResolvedValue(14);

      await service.update('inv1', { quantity: 8 });

      const emitCall = (eventEmitter.emit as jest.Mock).mock.calls[0];
      const event = emitCall[1] as LowStockEvent;

      expect(event.recentSales).toBe(14);
      expect(event.estimatedDaysUntilStockout).toBe(4); // Math.floor(8 / (14/7))
    });
  });

  describe('edge cases', () => {
    it('should handle concurrent adjustments', async () => {
      const inventory = { ...mockInventory, quantity: 100 };
      repo.findOne!.mockResolvedValue(inventory);
      repo.save!.mockResolvedValue(inventory);

      const promises = [
        service.adjust('v1', -5),
        service.adjust('v1', -3),
        service.adjust('v1', -2),
      ];

      await Promise.all(promises);

      expect(repo.findOne).toHaveBeenCalledTimes(3);
    });

    it('should handle zero quantity threshold correctly', async () => {
      const inventory = { ...mockInventory, quantity: 1 };

      repo.findOne!.mockResolvedValue(inventory);
      repo.save!.mockResolvedValue({ ...inventory, quantity: 0 });

      thresholdsConfig.isOutOfStock!.mockImplementation((qty) => qty === 0);
      eventEmitter.emit!.mockReturnValue(true);

      await service.update('inv1', { quantity: 0 });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'inventory.out-of-stock',
        expect.any(OutOfStockEvent)
      );
    });

    it('should handle missing product relations gracefully', async () => {
      const inventoryWithoutProduct = {
        ...mockInventory,
        variant: { ...mockVariant, product: null } as any,
      };

      repo.findOne!.mockResolvedValue(inventoryWithoutProduct);
      repo.save!.mockResolvedValue(inventoryWithoutProduct);

      // Should not throw
      await expect(
        service.update('inv1', { quantity: 50 })
      ).resolves.toBeDefined();
    });

    it('should handle very large quantity values', async () => {
      const inventory = { ...mockInventory, quantity: 999999 };

      repo.findOne!.mockResolvedValue(inventory);
      repo.save!.mockResolvedValue({ ...inventory, quantity: 1000000 });

      const result = await service.set('v1', 1000000);

      expect(result.quantity).toBe(1000000);
    });
  });
});
