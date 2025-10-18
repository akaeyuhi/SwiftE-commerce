import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InventoryNotificationService } from 'src/modules/infrastructure/notifications/inventory/inventory-notification.service';
import { StoreRoleService } from 'src/modules/store/store-role/store-role.service';
import { InventoryService } from 'src/modules/store/inventory/inventory.service';
import {
  LowStockEvent,
  OutOfStockEvent,
} from 'src/common/events/inventory/low-stock.event';
import { StoreRoles } from 'src/common/enums/store-roles.enum';
import { createMock, MockedMethods } from 'test/unit/helpers';
import { Store } from 'src/entities/store/store.entity';
import { Inventory } from 'src/entities/store/product/inventory.entity';
import { Product } from 'src/entities/store/product/product.entity';
import { ProductVariant } from 'src/entities/store/product/variant.entity';
import { User } from 'src/entities/user/user.entity';
import { Logger } from '@nestjs/common';
import { InventoryNotificationsListener } from 'src/modules/store/inventory/listeners/inventory-notifications.listener';

describe('InventoryNotificationsListener', () => {
  let listener: InventoryNotificationsListener;
  let eventEmitter: Partial<MockedMethods<EventEmitter2>>;
  let storeRoleService: Partial<MockedMethods<StoreRoleService>>;
  let inventoryService: Partial<MockedMethods<InventoryService>>;
  let notificationService: Partial<MockedMethods<InventoryNotificationService>>;

  const mockStore: Store = {
    id: 's1',
    name: 'Test Store',
  } as Store;

  const mockUser: User = {
    id: 'u1',
    email: 'admin@store.com',
    firstName: 'John',
    lastName: 'Doe',
  } as User;

  const mockVariant: ProductVariant = {
    id: 'v1',
    sku: 'TEST-SKU-001',
    product: {
      id: 'p1',
      name: 'Test Product',
      categories: [{ name: 'Electronics', parent: null }],
    } as unknown as Product,
  } as ProductVariant;

  const mockInventory: Inventory = {
    id: 'inv1',
    variant: mockVariant,
    store: mockStore,
    quantity: 5,
    lowStockThreshold: 10,
  } as unknown as Inventory;

  const mockStoreRole = {
    id: 'sr1',
    user: mockUser,
    roleName: StoreRoles.ADMIN,
    isActive: true,
    store: mockStore,
  };

  beforeEach(async () => {
    eventEmitter = createMock<EventEmitter2>([
      'on',
      'emit',
      'removeAllListeners',
    ]);
    storeRoleService = createMock<StoreRoleService>(['getStoreRoles']);
    inventoryService = createMock<InventoryService>([
      'findInventoryByVariantId',
    ]);
    notificationService = createMock<InventoryNotificationService>([
      'notifyLowStock',
      'notifyOutOfStock',
    ]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryNotificationsListener,
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: StoreRoleService, useValue: storeRoleService },
        { provide: InventoryService, useValue: inventoryService },
        {
          provide: InventoryNotificationService,
          useValue: notificationService,
        },
      ],
    }).compile();

    listener = module.get<InventoryNotificationsListener>(
      InventoryNotificationsListener
    );

    // Suppress logger output
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();

    jest.clearAllMocks();
  });

  describe('handleLowStock', () => {
    const lowStockEvent: LowStockEvent = {
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

    it('should send low stock notifications to store admins', async () => {
      inventoryService.findInventoryByVariantId!.mockResolvedValue(
        mockInventory
      );
      storeRoleService.getStoreRoles!.mockResolvedValue([mockStoreRole] as any);
      notificationService.notifyLowStock!.mockResolvedValue(undefined);

      await listener.handleLowStock(lowStockEvent);

      expect(inventoryService.findInventoryByVariantId).toHaveBeenCalledWith(
        'v1'
      );
      expect(storeRoleService.getStoreRoles).toHaveBeenCalledWith('s1');
      expect(notificationService.notifyLowStock).toHaveBeenCalledWith(
        'admin@store.com',
        'John Doe',
        expect.objectContaining({
          productName: 'Test Product',
          sku: 'TEST-SKU-001',
          currentStock: 5,
          threshold: 10,
          category: 'Electronics',
          storeName: 'Test Store',
        })
      );
    });

    it('should respect cooldown period for low stock alerts', async () => {
      inventoryService.findInventoryByVariantId!.mockResolvedValue(
        mockInventory
      );
      storeRoleService.getStoreRoles!.mockResolvedValue([mockStoreRole] as any);
      notificationService.notifyLowStock!.mockResolvedValue(undefined);

      // First notification should succeed
      await listener.handleLowStock(lowStockEvent);
      expect(notificationService.notifyLowStock).toHaveBeenCalledTimes(1);

      jest.clearAllMocks();

      // Second notification within cooldown should be skipped
      await listener.handleLowStock(lowStockEvent);
      expect(notificationService.notifyLowStock).not.toHaveBeenCalled();
    });

    it('should send to multiple store admins and moderators', async () => {
      const moderator = {
        ...mockStoreRole,
        id: 'sr2',
        user: { ...mockUser, id: 'u2', email: 'moderator@store.com' },
        roleName: StoreRoles.MODERATOR,
      };

      inventoryService.findInventoryByVariantId!.mockResolvedValue(
        mockInventory
      );
      storeRoleService.getStoreRoles!.mockResolvedValue([
        mockStoreRole,
        moderator,
      ] as any);
      notificationService.notifyLowStock!.mockResolvedValue(undefined);

      await listener.handleLowStock(lowStockEvent);

      expect(notificationService.notifyLowStock).toHaveBeenCalledTimes(2);
      expect(notificationService.notifyLowStock).toHaveBeenCalledWith(
        'admin@store.com',
        'John Doe',
        expect.any(Object)
      );
      expect(notificationService.notifyLowStock).toHaveBeenCalledWith(
        'moderator@store.com',
        'John Doe',
        expect.any(Object)
      );
    });

    it('should skip notification when no admins/moderators found', async () => {
      inventoryService.findInventoryByVariantId!.mockResolvedValue(
        mockInventory
      );
      storeRoleService.getStoreRoles!.mockResolvedValue([]);

      await listener.handleLowStock(lowStockEvent);

      expect(notificationService.notifyLowStock).not.toHaveBeenCalled();
    });

    it('should handle inventory not found error', async () => {
      inventoryService.findInventoryByVariantId!.mockResolvedValue(null);

      await expect(listener.handleLowStock(lowStockEvent)).rejects.toThrow(
        'Inventory with variant id  v1 not found'
      );

      expect(notificationService.notifyLowStock).not.toHaveBeenCalled();
    });

    it('should mark notification as critical when stock is very low', async () => {
      const criticalEvent = {
        ...lowStockEvent,
        currentStock: 2,
        threshold: 10,
      };

      inventoryService.findInventoryByVariantId!.mockResolvedValue(
        mockInventory
      );
      storeRoleService.getStoreRoles!.mockResolvedValue([mockStoreRole] as any);
      notificationService.notifyLowStock!.mockResolvedValue(undefined);

      await listener.handleLowStock(criticalEvent);

      expect(notificationService.notifyLowStock).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          isCritical: true,
          currentStock: 2,
          threshold: 10,
        })
      );
    });

    it('should use category from product when event category missing', async () => {
      const eventWithoutCategory = { ...lowStockEvent, category: undefined };

      inventoryService.findInventoryByVariantId!.mockResolvedValue(
        mockInventory
      );
      storeRoleService.getStoreRoles!.mockResolvedValue([mockStoreRole] as any);
      notificationService.notifyLowStock!.mockResolvedValue(undefined);

      await listener.handleLowStock(eventWithoutCategory);

      expect(notificationService.notifyLowStock).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          category: 'Electronics',
        })
      );
    });
  });

  describe('handleOutOfStock', () => {
    const outOfStockEvent: OutOfStockEvent = {
      variantId: 'v1',
      productId: 'p1',
      storeId: 's1',
      sku: 'TEST-SKU-001',
      productName: 'Test Product',
      category: 'Electronics',
    };

    it('should send out of stock notifications immediately', async () => {
      inventoryService.findInventoryByVariantId!.mockResolvedValue(
        mockInventory
      );
      storeRoleService.getStoreRoles!.mockResolvedValue([mockStoreRole] as any);
      notificationService.notifyOutOfStock!.mockResolvedValue(undefined);

      await listener.handleOutOfStock(outOfStockEvent);

      expect(notificationService.notifyOutOfStock).toHaveBeenCalledWith(
        'admin@store.com',
        'John Doe',
        expect.objectContaining({
          productName: 'Test Product',
          sku: 'TEST-SKU-001',
          category: 'Electronics',
          storeName: 'Test Store',
        })
      );
    });

    it('should not apply cooldown to out of stock alerts', async () => {
      inventoryService.findInventoryByVariantId!.mockResolvedValue(
        mockInventory
      );
      storeRoleService.getStoreRoles!.mockResolvedValue([mockStoreRole] as any);
      notificationService.notifyOutOfStock!.mockResolvedValue(undefined);

      await listener.handleOutOfStock(outOfStockEvent);
      await listener.handleOutOfStock(outOfStockEvent);

      expect(notificationService.notifyOutOfStock).toHaveBeenCalledTimes(2);
    });

    it('should handle notification service errors gracefully within batchProcess', async () => {
      const errorSpy = jest.spyOn(Logger.prototype, 'error');

      inventoryService.findInventoryByVariantId!.mockResolvedValue(
        mockInventory
      );
      storeRoleService.getStoreRoles!.mockResolvedValue([mockStoreRole] as any);
      notificationService.notifyOutOfStock!.mockRejectedValue(
        new Error('Email service down')
      );

      // batchProcess catches errors, so method completes normally
      await listener.handleOutOfStock(outOfStockEvent);

      // Verify error was logged by batchProcess
      expect(errorSpy).toHaveBeenCalledWith(
        'Batch processing error',
        expect.objectContaining({
          error: 'Email service down',
        })
      );

      // Verify notification was attempted
      expect(notificationService.notifyOutOfStock).toHaveBeenCalled();
    });

    it('should throw when inventory loading fails', async () => {
      inventoryService.findInventoryByVariantId!.mockResolvedValue(null);

      await expect(listener.handleOutOfStock(outOfStockEvent)).rejects.toThrow(
        'Inventory with variant id  v1 not found'
      );

      expect(notificationService.notifyOutOfStock).not.toHaveBeenCalled();
    });

    it('should throw when store not found', async () => {
      const inventoryWithoutStore = {
        ...mockInventory,
        store: undefined,
      };

      inventoryService.findInventoryByVariantId!.mockResolvedValue(
        inventoryWithoutStore as any
      );

      // Fix: Use direct string match instead of expect.stringContaining
      await expect(listener.handleOutOfStock(outOfStockEvent)).rejects.toThrow(
        /Store not found for variant v1/
      );

      expect(notificationService.notifyOutOfStock).not.toHaveBeenCalled();
    });

    it('should handle getStoreRoles errors gracefully and skip notification', async () => {
      const errorSpy = jest.spyOn(Logger.prototype, 'error');
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');

      inventoryService.findInventoryByVariantId!.mockResolvedValue(
        mockInventory
      );
      storeRoleService.getStoreRoles!.mockRejectedValue(
        new Error('Database connection failed')
      );

      // Method completes successfully but skips notification
      await listener.handleOutOfStock(outOfStockEvent);

      // Verify error was logged
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch notification recipients'),
        expect.any(String)
      );

      // Verify warning about no recipients
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No admins/moderators found')
      );

      // No notification should have been sent
      expect(notificationService.notifyOutOfStock).not.toHaveBeenCalled();
    });

    it('should continue processing when individual notification fails', async () => {
      const admin = mockStoreRole;
      const moderator = {
        ...mockStoreRole,
        id: 'sr2',
        user: { ...mockUser, id: 'u2', email: 'moderator@store.com' },
        roleName: StoreRoles.MODERATOR,
      };

      const errorSpy = jest.spyOn(Logger.prototype, 'error');

      inventoryService.findInventoryByVariantId!.mockResolvedValue(
        mockInventory
      );
      storeRoleService.getStoreRoles!.mockResolvedValue([
        admin,
        moderator,
      ] as any);

      // First notification fails, second succeeds
      notificationService
        .notifyOutOfStock!.mockRejectedValueOnce(
          new Error('First notification failed')
        )
        .mockResolvedValueOnce(undefined);

      // Should complete successfully despite first failure
      await listener.handleOutOfStock(outOfStockEvent);

      // Both notifications should have been attempted
      expect(notificationService.notifyOutOfStock).toHaveBeenCalledTimes(2);

      // Error should have been logged
      expect(errorSpy).toHaveBeenCalledWith(
        'Batch processing error',
        expect.objectContaining({
          error: 'First notification failed',
        })
      );
    });

    it('should skip notification when no recipients found', async () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');

      inventoryService.findInventoryByVariantId!.mockResolvedValue(
        mockInventory
      );
      storeRoleService.getStoreRoles!.mockResolvedValue([]);

      await listener.handleOutOfStock(outOfStockEvent);

      expect(notificationService.notifyOutOfStock).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No admins/moderators found')
      );
    });
  });

  describe('cooldown management', () => {
    let lowStockEvent: LowStockEvent;
    beforeEach(async () => {
      lowStockEvent = {
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

      inventoryService.findInventoryByVariantId!.mockResolvedValue(
        mockInventory
      );
      storeRoleService.getStoreRoles!.mockResolvedValue([mockStoreRole] as any);
      notificationService.notifyLowStock!.mockResolvedValue(undefined);

      // First alert should go through
      await listener.handleLowStock(lowStockEvent);
    });

    it('should check if variant is in cooldown', async () => {
      expect(notificationService.notifyLowStock).toHaveBeenCalledTimes(1);

      jest.clearAllMocks();

      // Second alert within cooldown should be blocked
      await listener.handleLowStock(lowStockEvent);
      expect(notificationService.notifyLowStock).not.toHaveBeenCalled();
    });

    it('should clear cooldown for specific variant', async () => {
      // Clear cooldown
      listener.clearCooldown('v1', 'low-stock');

      jest.clearAllMocks();

      // Alert should go through after clearing cooldown
      await listener.handleLowStock(lowStockEvent);
      expect(notificationService.notifyLowStock).toHaveBeenCalledTimes(1);
    });

    it('should get active cooldowns', async () => {
      const cooldowns = listener.getActiveCooldowns();

      expect(cooldowns).toHaveLength(1);
      expect(cooldowns[0]).toMatchObject({
        variantId: 'v1',
        type: 'low-stock',
      });
      expect(cooldowns[0].expiresIn).toBeGreaterThan(0);
    });

    it('should get cooldown statistics', async () => {
      const stats = listener.getCooldownStats();

      expect(stats.totalActive).toBe(1);
      expect(stats.byType['low-stock']).toBe(1);
      expect(stats.oldestCooldown).not.toBeNull();
      expect(stats.newestCooldown).not.toBeNull();
    });

    it('should cleanup expired cooldowns', () => {
      // Manually set an expired cooldown
      (listener as any).alertCache.set(
        'v1:low-stock',
        Date.now() - 2 * 60 * 60 * 1000
      ); // 2 hours ago

      const cleaned = listener.cleanupExpiredCooldowns();

      expect(cleaned).toBe(1);
      expect(listener.getActiveCooldowns()).toHaveLength(0);
    });

    it('should clear all cooldowns for a variant', async () => {
      const cleared = listener.clearAllVariantCooldowns('v1');

      expect(cleared).toBeGreaterThan(0);
      expect(listener.getActiveCooldowns()).toHaveLength(0);
    });
  });

  describe('manualNotify', () => {
    it('should manually trigger low stock notification', async () => {
      inventoryService.findInventoryByVariantId!.mockResolvedValue(
        mockInventory
      );
      storeRoleService.getStoreRoles!.mockResolvedValue([mockStoreRole] as any);
      notificationService.notifyLowStock!.mockResolvedValue(undefined);

      const result = await listener.manualNotify('v1', 'low-stock');

      expect(result.success).toBe(true);
      expect(result.recipientCount).toBe(1);
      expect(notificationService.notifyLowStock).toHaveBeenCalled();
    });

    it('should manually trigger out of stock notification', async () => {
      inventoryService.findInventoryByVariantId!.mockResolvedValue(
        mockInventory
      );
      storeRoleService.getStoreRoles!.mockResolvedValue([mockStoreRole] as any);
      notificationService.notifyOutOfStock!.mockResolvedValue(undefined);

      const result = await listener.manualNotify('v1', 'out-of-stock');

      expect(result.success).toBe(true);
      expect(result.recipientCount).toBe(1);
      expect(notificationService.notifyOutOfStock).toHaveBeenCalled();
    });

    it('should bypass cooldown for manual notifications', async () => {
      inventoryService.findInventoryByVariantId!.mockResolvedValue(
        mockInventory
      );
      storeRoleService.getStoreRoles!.mockResolvedValue([mockStoreRole] as any);
      notificationService.notifyLowStock!.mockResolvedValue(undefined);

      // Set cooldown by triggering normal notification
      await listener.handleLowStock({
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
      });

      jest.clearAllMocks();

      // Manual notification should bypass cooldown
      const result = await listener.manualNotify('v1', 'low-stock');

      expect(result.success).toBe(true);
      expect(notificationService.notifyLowStock).toHaveBeenCalled();
    });

    it('should handle inventory not found in manual notify', async () => {
      inventoryService.findInventoryByVariantId!.mockResolvedValue(null);

      const result = await listener.manualNotify('v1', 'low-stock');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Inventory not found');
    });

    it('should handle no recipients in manual notify', async () => {
      inventoryService.findInventoryByVariantId!.mockResolvedValue(
        mockInventory
      );
      storeRoleService.getStoreRoles!.mockResolvedValue([]);

      const result = await listener.manualNotify('v1', 'low-stock');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No eligible recipients found');
    });
  });

  describe('recipient filtering', () => {
    it('should filter inactive store roles', async () => {
      const inactiveRole = {
        ...mockStoreRole,
        id: 'sr2',
        isActive: false,
      };

      inventoryService.findInventoryByVariantId!.mockResolvedValue(
        mockInventory
      );
      storeRoleService.getStoreRoles!.mockResolvedValue([
        mockStoreRole,
        inactiveRole,
      ] as any);
      notificationService.notifyLowStock!.mockResolvedValue(undefined);

      await listener.handleLowStock({
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
      });

      // Should only send to active role
      expect(notificationService.notifyLowStock).toHaveBeenCalledTimes(1);
    });

    it('should exclude non-admin/moderator roles', async () => {
      const memberRole = {
        ...mockStoreRole,
        id: 'sr2',
        roleName: StoreRoles.GUEST,
      };

      inventoryService.findInventoryByVariantId!.mockResolvedValue(
        mockInventory
      );
      storeRoleService.getStoreRoles!.mockResolvedValue([
        mockStoreRole,
        memberRole,
      ] as any);
      notificationService.notifyLowStock!.mockResolvedValue(undefined);

      await listener.handleLowStock({
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
      });

      // Should only send to admin, not member
      expect(notificationService.notifyLowStock).toHaveBeenCalledTimes(1);
    });
  });
});
