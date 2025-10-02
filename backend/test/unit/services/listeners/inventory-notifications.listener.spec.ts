import { Test, TestingModule } from '@nestjs/testing';
import { InventoryNotificationService } from 'src/modules/infrastructure/notifications/inventory/inventory-notification.service';
import { StoreRoleService } from 'src/modules/store/store-role/store-role.service';
import { VariantsService } from 'src/modules/store/variants/variants.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Logger } from '@nestjs/common';
import {
  LowStockEvent,
  OutOfStockEvent,
} from 'src/common/events/inventory/low-stock.event';
import { ProductVariant } from 'src/entities/store/product/variant.entity';
import { Product } from 'src/entities/store/product/product.entity';
import { Store } from 'src/entities/store/store.entity';
import { User } from 'src/entities/user/user.entity';
import { StoreRole } from 'src/entities/user/policy/store-role.entity';
import { StoreRoles } from 'src/common/enums/store-roles.enum';
import { DomainEvent } from 'src/common/interfaces/infrastructure/event.interface';
import { createMock, MockedMethods } from '../../utils/helpers';
import { InventoryNotificationsListener } from 'src/modules/store/inventory/listeners/inventory-notifications.listener';

describe('InventoryNotificationsListener', () => {
  let listener: InventoryNotificationsListener;
  let variantsService: Partial<MockedMethods<VariantsService>>;
  let storeRoleService: Partial<MockedMethods<StoreRoleService>>;
  let inventoryNotificationService: Partial<
    MockedMethods<InventoryNotificationService>
  >;
  let eventEmitter: Partial<MockedMethods<EventEmitter2>>;

  const mockUser: User = {
    id: 'u1',
    email: 'admin@example.com',
    firstName: 'Store',
    lastName: 'Admin',
  } as User;

  const mockStore: Store = {
    id: 's1',
    name: 'Test Store',
  } as Store;

  const mockProduct: Product = {
    id: 'p1',
    name: 'Test Product',
    store: mockStore,
    categories: [{ name: 'Electronics', parent: null }],
  } as any;

  const mockVariant: ProductVariant = {
    id: 'v1',
    sku: 'TEST-SKU-001',
    product: mockProduct,
  } as ProductVariant;

  const mockStoreRole: StoreRole = {
    id: 'role-1',
    user: mockUser,
    store: mockStore,
    roleName: StoreRoles.ADMIN,
    isActive: true,
  } as StoreRole;

  const mockLowStockEvent: LowStockEvent = {
    variantId: 'v1',
    productId: 'p1',
    storeId: 's1',
    sku: 'TEST-SKU-001',
    productName: 'Test Product',
    currentStock: 5,
    threshold: 10,
    recentSales: 15,
    estimatedDaysUntilStockout: 3,
    category: 'Electronics',
  };

  const mockOutOfStockEvent: OutOfStockEvent = {
    variantId: 'v1',
    productId: 'p1',
    storeId: 's1',
    sku: 'TEST-SKU-001',
    productName: 'Test Product',
    category: 'Electronics',
  };

  beforeEach(async () => {
    variantsService = createMock<VariantsService>(['findWithRelations']);
    storeRoleService = createMock<StoreRoleService>(['getStoreRoles']);
    inventoryNotificationService = createMock<InventoryNotificationService>([
      'notifyLowStock',
      'notifyOutOfStock',
    ]);
    eventEmitter = createMock<EventEmitter2>(['on', 'emit']);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryNotificationsListener,
        { provide: VariantsService, useValue: variantsService },
        { provide: StoreRoleService, useValue: storeRoleService },
        {
          provide: InventoryNotificationService,
          useValue: inventoryNotificationService,
        },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    listener = module.get<InventoryNotificationsListener>(
      InventoryNotificationsListener
    );

    // Suppress logger output
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clear cooldowns after each test
    (listener as any).alertCache.clear();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(listener).toBeDefined();
    });

    it('should extend BaseNotificationListener', () => {
      expect(listener).toBeInstanceOf(InventoryNotificationsListener);
    });

    it('should have cooldown configuration', () => {
      expect((listener as any).ALERT_COOLDOWN_MS).toBe(60 * 60 * 1000);
    });

    it('should have retry configuration', () => {
      expect((listener as any).maxRetries).toBe(3);
      expect((listener as any).baseRetryDelay).toBe(3000);
    });
  });

  describe('getEventTypes', () => {
    it('should return supported event types', () => {
      const eventTypes = (listener as any).getEventTypes();

      expect(eventTypes).toEqual([
        'inventory.low-stock',
        'inventory.out-of-stock',
      ]);
      expect(eventTypes).toHaveLength(2);
    });
  });

  describe('handleEvent', () => {
    it('should route low-stock event to handleLowStock', async () => {
      const handleLowStockSpy = jest
        .spyOn(listener, 'handleLowStock')
        .mockResolvedValue(undefined);

      const event: DomainEvent<LowStockEvent> = {
        type: 'inventory.low-stock',
        data: mockLowStockEvent,
        occurredAt: new Date(),
        aggregateId: '',
      };

      await (listener as any).handleEvent(event);

      expect(handleLowStockSpy).toHaveBeenCalledWith(mockLowStockEvent);
    });

    it('should route out-of-stock event to handleOutOfStock', async () => {
      const handleOutOfStockSpy = jest
        .spyOn(listener, 'handleOutOfStock')
        .mockResolvedValue(undefined);

      const event: DomainEvent<OutOfStockEvent> = {
        type: 'inventory.out-of-stock',
        data: mockOutOfStockEvent,
        aggregateId: '',
        occurredAt: new Date(),
      };

      await (listener as any).handleEvent(event);

      expect(handleOutOfStockSpy).toHaveBeenCalledWith(mockOutOfStockEvent);
    });

    it('should log warning for unknown event type', async () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'warn');

      const event: DomainEvent<any> = {
        type: 'unknown.event' as any,
        data: {},
        occurredAt: new Date(),
        aggregateId: '',
      };

      await (listener as any).handleEvent(event);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown event type')
      );
    });
  });

  describe('handleLowStock', () => {
    beforeEach(() => {
      variantsService.findWithRelations!.mockResolvedValue(mockVariant);
      storeRoleService.getStoreRoles!.mockResolvedValue([mockStoreRole]);
      inventoryNotificationService.notifyLowStock!.mockResolvedValue(undefined);
    });

    it('should send low stock notification', async () => {
      await listener.handleLowStock(mockLowStockEvent);

      expect(inventoryNotificationService.notifyLowStock).toHaveBeenCalled();
    });

    it('should check cooldown before sending', async () => {
      const isInCooldownSpy = jest.spyOn(listener as any, 'isInCooldown');

      await listener.handleLowStock(mockLowStockEvent);

      expect(isInCooldownSpy).toHaveBeenCalledWith('v1', 'low-stock');
    });

    it('should skip notification if in cooldown', async () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'debug');

      // Set cooldown
      (listener as any).setCooldown('v1', 'low-stock');

      await listener.handleLowStock(mockLowStockEvent);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('in cooldown period')
      );
      expect(
        inventoryNotificationService.notifyLowStock
      ).not.toHaveBeenCalled();
    });

    it('should load variant with relations', async () => {
      await listener.handleLowStock(mockLowStockEvent);

      expect(variantsService.findWithRelations).toHaveBeenCalledWith('v1');
    });

    it('should fetch store recipients', async () => {
      await listener.handleLowStock(mockLowStockEvent);

      expect(storeRoleService.getStoreRoles).toHaveBeenCalledWith('s1');
    });

    it('should warn when no recipients found', async () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'warn');
      storeRoleService.getStoreRoles!.mockResolvedValue([]);

      await listener.handleLowStock(mockLowStockEvent);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('No admins/moderators found')
      );
      expect(
        inventoryNotificationService.notifyLowStock
      ).not.toHaveBeenCalled();
    });

    it('should build notification data correctly', async () => {
      await listener.handleLowStock(mockLowStockEvent);

      expect(inventoryNotificationService.notifyLowStock).toHaveBeenCalledWith(
        'admin@example.com',
        'Store Admin',
        expect.objectContaining({
          productName: 'Test Product',
          sku: 'TEST-SKU-001',
          currentStock: 5,
          threshold: 10,
          recentSales: 15,
          estimatedDays: 3,
        })
      );
    });

    it('should mark as critical when stock below half threshold', async () => {
      const criticalEvent = {
        ...mockLowStockEvent,
        currentStock: 3,
        threshold: 10,
      };

      await listener.handleLowStock(criticalEvent);

      expect(inventoryNotificationService.notifyLowStock).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          isCritical: true,
        })
      );
    });

    it('should not mark as critical when stock above half threshold', async () => {
      await listener.handleLowStock(mockLowStockEvent);

      expect(inventoryNotificationService.notifyLowStock).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          isCritical: false,
        })
      );
    });

    it('should set cooldown after notification', async () => {
      const setCooldownSpy = jest.spyOn(listener as any, 'setCooldown');

      await listener.handleLowStock(mockLowStockEvent);

      expect(setCooldownSpy).toHaveBeenCalledWith('v1', 'low-stock');
    });

    it('should log processing and completion messages', async () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'log');

      await listener.handleLowStock(mockLowStockEvent);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Processing low stock alert')
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('sent to 1 recipients')
      );
    });

    it('should handle errors and rethrow', async () => {
      const error = new Error('Notification service error');
      inventoryNotificationService.notifyLowStock!.mockRejectedValue(error);

      await expect(listener.handleLowStock(mockLowStockEvent)).rejects.toThrow(
        error
      );
    });

    it('should record metrics on success', async () => {
      const recordMetricsSpy = jest.spyOn(listener as any, 'recordMetrics');

      await listener.handleLowStock(mockLowStockEvent);

      expect(recordMetricsSpy).toHaveBeenCalledWith(
        'inventory.low-stock',
        true,
        expect.any(Number)
      );
    });

    it('should record metrics on failure', async () => {
      const recordMetricsSpy = jest.spyOn(listener as any, 'recordMetrics');
      inventoryNotificationService.notifyLowStock!.mockRejectedValue(
        new Error('Failed')
      );

      try {
        await listener.handleLowStock(mockLowStockEvent);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e) {
        // Expected
      }

      expect(recordMetricsSpy).toHaveBeenCalledWith(
        'inventory.low-stock',
        false,
        expect.any(Number)
      );
    });
  });

  describe('handleOutOfStock', () => {
    beforeEach(() => {
      variantsService.findWithRelations!.mockResolvedValue(mockVariant);
      storeRoleService.getStoreRoles!.mockResolvedValue([mockStoreRole]);
      inventoryNotificationService.notifyOutOfStock!.mockResolvedValue(
        undefined
      );
    });

    it('should send out of stock notification', async () => {
      await listener.handleOutOfStock(mockOutOfStockEvent);

      expect(inventoryNotificationService.notifyOutOfStock).toHaveBeenCalled();
    });

    it('should not check cooldown for out of stock', async () => {
      const isInCooldownSpy = jest.spyOn(listener as any, 'isInCooldown');

      await listener.handleOutOfStock(mockOutOfStockEvent);

      expect(isInCooldownSpy).not.toHaveBeenCalled();
    });

    it('should log critical warning', async () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'warn');

      await listener.handleOutOfStock(mockOutOfStockEvent);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('OUT OF STOCK alert')
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('CRITICAL')
      );
    });

    it('should build notification data correctly', async () => {
      await listener.handleOutOfStock(mockOutOfStockEvent);

      expect(
        inventoryNotificationService.notifyOutOfStock
      ).toHaveBeenCalledWith(
        'admin@example.com',
        'Store Admin',
        expect.objectContaining({
          productName: 'Test Product',
          sku: 'TEST-SKU-001',
          category: 'Electronics',
        })
      );
    });

    it('should warn when no recipients found', async () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'warn');
      storeRoleService.getStoreRoles!.mockResolvedValue([]);

      await listener.handleOutOfStock(mockOutOfStockEvent);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('No admins/moderators found')
      );
    });

    it('should log completion message', async () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'log');

      await listener.handleOutOfStock(mockOutOfStockEvent);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('OUT OF STOCK alerts')
      );
    });

    it('should record metrics on success', async () => {
      const recordMetricsSpy = jest.spyOn(listener as any, 'recordMetrics');

      await listener.handleOutOfStock(mockOutOfStockEvent);

      expect(recordMetricsSpy).toHaveBeenCalledWith(
        'inventory.out-of-stock',
        true,
        expect.any(Number)
      );
    });

    it('should handle errors and rethrow', async () => {
      const error = new Error('Service error');
      inventoryNotificationService.notifyOutOfStock!.mockRejectedValue(error);

      await expect(
        listener.handleOutOfStock(mockOutOfStockEvent)
      ).rejects.toThrow(error);
    });
  });

  describe('getStoreNotificationRecipients', () => {
    it('should return admins and moderators', async () => {
      storeRoleService.getStoreRoles!.mockResolvedValue([mockStoreRole]);

      const recipients = await (listener as any).getStoreNotificationRecipients(
        's1'
      );

      expect(recipients).toHaveLength(1);
      expect(recipients[0]).toEqual({
        email: 'admin@example.com',
        name: 'Store Admin',
        userId: 'u1',
        role: StoreRoles.ADMIN,
      });
    });

    it('should include moderators', async () => {
      const moderatorRole = {
        ...mockStoreRole,
        roleName: StoreRoles.MODERATOR,
      };
      storeRoleService.getStoreRoles!.mockResolvedValue([moderatorRole]);

      const recipients = await (listener as any).getStoreNotificationRecipients(
        's1'
      );

      expect(recipients).toHaveLength(1);
      expect(recipients[0].role).toBe(StoreRoles.MODERATOR);
    });

    it('should exclude guests', async () => {
      const guestRole = { ...mockStoreRole, roleName: StoreRoles.GUEST };
      storeRoleService.getStoreRoles!.mockResolvedValue([guestRole]);

      const recipients = await (listener as any).getStoreNotificationRecipients(
        's1'
      );

      expect(recipients).toHaveLength(0);
    });

    it('should exclude inactive roles', async () => {
      const inactiveRole = { ...mockStoreRole, isActive: false };
      storeRoleService.getStoreRoles!.mockResolvedValue([inactiveRole]);

      const recipients = await (listener as any).getStoreNotificationRecipients(
        's1'
      );

      expect(recipients).toHaveLength(0);
    });

    it('should filter out users without email', async () => {
      const roleWithoutEmail = {
        ...mockStoreRole,
        user: { ...mockUser, email: null } as unknown as User,
      };
      storeRoleService.getStoreRoles!.mockResolvedValue([roleWithoutEmail]);

      const recipients = await (listener as any).getStoreNotificationRecipients(
        's1'
      );

      expect(recipients).toHaveLength(0);
    });

    it('should handle service errors gracefully', async () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'error');
      storeRoleService.getStoreRoles!.mockRejectedValue(
        new Error('Service error')
      );

      const recipients = await (listener as any).getStoreNotificationRecipients(
        's1'
      );

      expect(recipients).toHaveLength(0);
      expect(loggerSpy).toHaveBeenCalled();
    });
  });

  describe('extractCategoryName', () => {
    it('should return top-level category name', () => {
      const categories = [
        { name: 'Electronics', parent: null },
        { name: 'Phones', parent: { id: 'cat1' } },
      ];

      const categoryName = (listener as any).extractCategoryName(categories);

      expect(categoryName).toBe('Electronics');
    });

    it('should return first category when no top-level', () => {
      const categories = [
        { name: 'Phones', parent: { id: 'cat1' } },
        { name: 'Smartphones', parent: { id: 'cat2' } },
      ];

      const categoryName = (listener as any).extractCategoryName(categories);

      expect(categoryName).toBe('Phones');
    });

    it('should return null for empty categories', () => {
      const categoryName = (listener as any).extractCategoryName([]);

      expect(categoryName).toBeNull();
    });

    it('should return null for undefined categories', () => {
      const categoryName = (listener as any).extractCategoryName(undefined);

      expect(categoryName).toBeNull();
    });
  });

  describe('cooldown management', () => {
    describe('isInCooldown', () => {
      it('should return false when no cooldown set', () => {
        const result = (listener as any).isInCooldown('v1', 'low-stock');

        expect(result).toBe(false);
      });

      it('should return true when in cooldown period', () => {
        (listener as any).setCooldown('v1', 'low-stock');

        const result = (listener as any).isInCooldown('v1', 'low-stock');

        expect(result).toBe(true);
      });

      it('should return false after cooldown expires', () => {
        (listener as any).setCooldown('v1', 'low-stock');

        // Simulate time passage
        const cache = (listener as any).alertCache;
        const key = (listener as any).getCooldownKey('v1', 'low-stock');
        cache.set(key, Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago

        const result = (listener as any).isInCooldown('v1', 'low-stock');

        expect(result).toBe(false);
      });
    });

    describe('clearCooldown', () => {
      it('should clear specific cooldown', () => {
        (listener as any).setCooldown('v1', 'low-stock');

        listener.clearCooldown('v1', 'low-stock');

        expect((listener as any).isInCooldown('v1', 'low-stock')).toBe(false);
      });

      it('should log when clearing cooldown', () => {
        const loggerSpy = jest.spyOn(Logger.prototype, 'log');
        (listener as any).setCooldown('v1', 'low-stock');

        listener.clearCooldown('v1', 'low-stock');

        expect(loggerSpy).toHaveBeenCalledWith(
          expect.stringContaining('Cleared cooldown')
        );
      });
    });

    describe('clearAllVariantCooldowns', () => {
      it('should clear all cooldowns for variant', () => {
        (listener as any).setCooldown('v1', 'low-stock');
        (listener as any).setCooldown('v1', 'out-of-stock');

        const cleared = listener.clearAllVariantCooldowns('v1');

        expect(cleared).toBe(2);
        expect((listener as any).isInCooldown('v1', 'low-stock')).toBe(false);
        expect((listener as any).isInCooldown('v1', 'out-of-stock')).toBe(
          false
        );
      });

      it('should return 0 when no cooldowns exist', () => {
        const cleared = listener.clearAllVariantCooldowns('v1');

        expect(cleared).toBe(0);
      });

      it('should log when clearing multiple cooldowns', () => {
        const loggerSpy = jest.spyOn(Logger.prototype, 'log');
        (listener as any).setCooldown('v1', 'low-stock');

        listener.clearAllVariantCooldowns('v1');

        expect(loggerSpy).toHaveBeenCalledWith(
          expect.stringContaining('Cleared 1 cooldowns')
        );
      });
    });

    describe('getActiveCooldowns', () => {
      it('should return active cooldowns', () => {
        (listener as any).setCooldown('v1', 'low-stock');
        (listener as any).setCooldown('v2', 'out-of-stock');

        const cooldowns = listener.getActiveCooldowns();

        expect(cooldowns).toHaveLength(2);
        expect(cooldowns[0]).toHaveProperty('variantId');
        expect(cooldowns[0]).toHaveProperty('type');
        expect(cooldowns[0]).toHaveProperty('expiresIn');
        expect(cooldowns[0]).toHaveProperty('expiresInMinutes');
      });

      it('should exclude expired cooldowns', () => {
        const cache = (listener as any).alertCache;
        cache.set('v1:low-stock', Date.now() - 2 * 60 * 60 * 1000); // Expired
        cache.set('v2:low-stock', Date.now()); // Active

        const cooldowns = listener.getActiveCooldowns();

        expect(cooldowns).toHaveLength(1);
        expect(cooldowns[0].variantId).toBe('v2');
      });

      it('should clean up expired entries', () => {
        const cache = (listener as any).alertCache;
        cache.set('v1:low-stock', Date.now() - 2 * 60 * 60 * 1000);

        listener.getActiveCooldowns();

        expect(cache.has('v1:low-stock')).toBe(false);
      });
    });

    describe('getCooldownStats', () => {
      it('should return cooldown statistics', () => {
        (listener as any).setCooldown('v1', 'low-stock');
        (listener as any).setCooldown('v2', 'low-stock');
        (listener as any).setCooldown('v3', 'out-of-stock');

        const stats = listener.getCooldownStats();

        expect(stats.totalActive).toBe(3);
        expect(stats.byType).toEqual({
          'low-stock': 2,
          'out-of-stock': 1,
        });
        expect(stats.oldestCooldown).toBeDefined();
        expect(stats.newestCooldown).toBeDefined();
      });

      it('should return empty stats when no cooldowns', () => {
        const stats = listener.getCooldownStats();

        expect(stats.totalActive).toBe(0);
        expect(stats.byType).toEqual({});
        expect(stats.oldestCooldown).toBeNull();
        expect(stats.newestCooldown).toBeNull();
      });
    });

    describe('cleanupExpiredCooldowns', () => {
      it('should remove expired cooldowns', () => {
        const cache = (listener as any).alertCache;
        cache.set('v1:low-stock', Date.now() - 2 * 60 * 60 * 1000); // Expired
        cache.set('v2:low-stock', Date.now()); // Active

        const cleaned = listener.cleanupExpiredCooldowns();

        expect(cleaned).toBe(1);
        expect(cache.has('v1:low-stock')).toBe(false);
        expect(cache.has('v2:low-stock')).toBe(true);
      });

      it('should log debug message when cleanup occurs', () => {
        const loggerSpy = jest.spyOn(Logger.prototype, 'debug');
        const cache = (listener as any).alertCache;
        cache.set('v1:low-stock', Date.now() - 2 * 60 * 60 * 1000);

        listener.cleanupExpiredCooldowns();

        expect(loggerSpy).toHaveBeenCalledWith(
          expect.stringContaining('Cleaned up 1 expired cooldowns')
        );
      });

      it('should return 0 when no expired cooldowns', () => {
        (listener as any).setCooldown('v1', 'low-stock');

        const cleaned = listener.cleanupExpiredCooldowns();

        expect(cleaned).toBe(0);
      });
    });
  });

  describe('manualNotify', () => {
    beforeEach(() => {
      variantsService.findWithRelations!.mockResolvedValue(mockVariant);
      storeRoleService.getStoreRoles!.mockResolvedValue([mockStoreRole]);
      inventoryNotificationService.notifyLowStock!.mockResolvedValue(undefined);
      inventoryNotificationService.notifyOutOfStock!.mockResolvedValue(
        undefined
      );
    });

    it('should trigger low-stock notification', async () => {
      const result = await listener.manualNotify('v1', 'low-stock');

      expect(result.success).toBe(true);
      expect(result.recipientCount).toBe(1);
      expect(inventoryNotificationService.notifyLowStock).toHaveBeenCalled();
    });

    it('should trigger out-of-stock notification', async () => {
      const result = await listener.manualNotify('v1', 'out-of-stock');

      expect(result.success).toBe(true);
      expect(result.recipientCount).toBe(1);
      expect(inventoryNotificationService.notifyOutOfStock).toHaveBeenCalled();
    });

    it('should clear cooldown before notification', async () => {
      const clearCooldownSpy = jest.spyOn(listener, 'clearCooldown');

      await listener.manualNotify('v1', 'low-stock');

      expect(clearCooldownSpy).toHaveBeenCalledWith('v1', 'low-stock');
    });

    it('should return error when variant not found', async () => {
      variantsService.findWithRelations!.mockResolvedValue(null);

      const result = await listener.manualNotify('v1', 'low-stock');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Variant not found');
    });

    it('should return error when store not found', async () => {
      const variantWithoutStore = {
        ...mockVariant,
        product: { ...mockProduct, store: null },
      };
      variantsService.findWithRelations!.mockResolvedValue(
        variantWithoutStore as any
      );

      const result = await listener.manualNotify('v1', 'low-stock');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Store not found for variant');
    });

    it('should return error when no recipients found', async () => {
      storeRoleService.getStoreRoles!.mockResolvedValue([]);

      const result = await listener.manualNotify('v1', 'low-stock');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No eligible recipients found');
    });

    it('should log warning for manual trigger', async () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'warn');

      await listener.manualNotify('v1', 'low-stock');

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Manual notification triggered')
      );
    });

    it('should handle errors gracefully', async () => {
      variantsService.findWithRelations!.mockRejectedValue(
        new Error('Database error')
      );

      const result = await listener.manualNotify('v1', 'low-stock');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('integration scenarios', () => {
    beforeEach(() => {
      variantsService.findWithRelations!.mockResolvedValue(mockVariant);
      storeRoleService.getStoreRoles!.mockResolvedValue([mockStoreRole]);
      inventoryNotificationService.notifyLowStock!.mockResolvedValue(undefined);
    });

    it('should handle multiple low stock events with cooldown', async () => {
      // First notification should succeed
      await listener.handleLowStock(mockLowStockEvent);
      expect(inventoryNotificationService.notifyLowStock).toHaveBeenCalledTimes(
        1
      );

      // Second notification should be skipped (cooldown)
      await listener.handleLowStock(mockLowStockEvent);
      expect(inventoryNotificationService.notifyLowStock).toHaveBeenCalledTimes(
        1
      );

      // Clear cooldown and try again
      listener.clearCooldown('v1', 'low-stock');
      await listener.handleLowStock(mockLowStockEvent);
      expect(inventoryNotificationService.notifyLowStock).toHaveBeenCalledTimes(
        2
      );
    });

    it('should handle multiple recipients', async () => {
      const admin2 = {
        ...mockStoreRole,
        id: 'role-2',
        user: { ...mockUser, id: 'u2', email: 'admin2@example.com' } as User,
      };
      const moderator = {
        ...mockStoreRole,
        id: 'role-3',
        roleName: StoreRoles.MODERATOR,
        user: { ...mockUser, id: 'u3', email: 'mod@example.com' } as User,
      };

      storeRoleService.getStoreRoles!.mockResolvedValue([
        mockStoreRole,
        admin2,
        moderator,
      ]);

      await listener.handleLowStock(mockLowStockEvent);

      expect(inventoryNotificationService.notifyLowStock).toHaveBeenCalledTimes(
        3
      );
    });
  });
});
