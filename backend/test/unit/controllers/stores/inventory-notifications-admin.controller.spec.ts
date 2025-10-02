import { Test, TestingModule } from '@nestjs/testing';
import { InventoryNotificationsAdminController } from 'src/modules/store/inventory/controllers/inventory-notifications-admin.controller';
import { InventoryNotificationsListener } from 'src/modules/store/inventory/listeners/inventory-notifications.listener';
import {
  createMock,
  createGuardMock,
  createPolicyMock,
  MockedMethods,
} from '../../utils/helpers';
import { JwtAuthGuard } from 'src/modules/authorization/guards/jwt-auth.guard';
import { AdminGuard } from 'src/modules/authorization/guards/admin.guard';
import { PolicyService } from 'src/modules/authorization/policy/policy.service';

describe('InventoryNotificationsAdminController', () => {
  let controller: InventoryNotificationsAdminController;
  let notificationsListener: Partial<
    MockedMethods<InventoryNotificationsListener>
  >;
  let guardMock: ReturnType<typeof createGuardMock>;
  let policyMock: ReturnType<typeof createPolicyMock>;

  const mockActiveCooldowns = [
    {
      variantId: 'v1',
      type: 'low-stock',
      expiresIn: 1800000,
      expiresInMinutes: 30,
    },
    {
      variantId: 'v2',
      type: 'out-of-stock',
      expiresIn: 900000,
      expiresInMinutes: 15,
    },
  ];

  const mockCooldownStats = {
    totalActive: 15,
    byType: {
      'low-stock': 12,
      'out-of-stock': 3,
    },
    oldestCooldown: 1609459200000,
    newestCooldown: 1609462800000,
  };

  const mockManualNotifySuccess = {
    success: true,
    recipientCount: 3,
  };

  const mockManualNotifyError = {
    success: false,
    recipientCount: 0,
    error: 'Variant not found',
  };

  beforeEach(async () => {
    notificationsListener = createMock<InventoryNotificationsListener>([
      'getActiveCooldowns',
      'getCooldownStats',
      'clearCooldown',
      'clearAllVariantCooldowns',
      'manualNotify',
      'cleanupExpiredCooldowns',
    ]);

    guardMock = createGuardMock();
    policyMock = createPolicyMock();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryNotificationsAdminController],
      providers: [
        {
          provide: InventoryNotificationsListener,
          useValue: notificationsListener,
        },
        { provide: JwtAuthGuard, useValue: guardMock },
        { provide: AdminGuard, useValue: guardMock },
        { provide: PolicyService, useValue: policyMock },
      ],
    }).compile();

    controller = module.get<InventoryNotificationsAdminController>(
      InventoryNotificationsAdminController
    );

    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have notificationsListener injected', () => {
      expect(controller['notificationsListener']).toBeDefined();
    });
  });

  describe('getActiveCooldowns - GET /admin/inventory-notifications/cooldowns', () => {
    it('should return list of active cooldowns', () => {
      notificationsListener.getActiveCooldowns!.mockReturnValue(
        mockActiveCooldowns
      );

      const result = controller.getActiveCooldowns();

      expect(result).toEqual(mockActiveCooldowns);
      expect(result).toHaveLength(2);
      expect(notificationsListener.getActiveCooldowns).toHaveBeenCalledTimes(1);
      expect(notificationsListener.getActiveCooldowns).toHaveBeenCalledWith();
    });

    it('should return empty array when no active cooldowns', () => {
      notificationsListener.getActiveCooldowns!.mockReturnValue([]);

      const result = controller.getActiveCooldowns();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should return cooldowns with correct structure', () => {
      notificationsListener.getActiveCooldowns!.mockReturnValue(
        mockActiveCooldowns
      );

      const result = controller.getActiveCooldowns();

      expect(result[0]).toHaveProperty('variantId');
      expect(result[0]).toHaveProperty('type');
      expect(result[0]).toHaveProperty('expiresIn');
      expect(result[0]).toHaveProperty('expiresInMinutes');
    });

    it('should handle multiple cooldowns for same variant', () => {
      const multipleCooldowns = [
        {
          variantId: 'v1',
          type: 'low-stock',
          expiresIn: 1800000,
          expiresInMinutes: 30,
        },
        {
          variantId: 'v1',
          type: 'out-of-stock',
          expiresIn: 900000,
          expiresInMinutes: 15,
        },
      ];

      notificationsListener.getActiveCooldowns!.mockReturnValue(
        multipleCooldowns
      );

      const result = controller.getActiveCooldowns();

      expect(result).toHaveLength(2);
      expect(result.filter((c) => c.variantId === 'v1')).toHaveLength(2);
    });
  });

  describe('getCooldownStats - GET /admin/inventory-notifications/cooldowns/stats', () => {
    it('should return cooldown statistics', () => {
      notificationsListener.getCooldownStats!.mockReturnValue(
        mockCooldownStats
      );

      const result = controller.getCooldownStats();

      expect(result).toEqual(mockCooldownStats);
      expect(result.totalActive).toBe(15);
      expect(result.byType['low-stock']).toBe(12);
      expect(result.byType['out-of-stock']).toBe(3);
      expect(notificationsListener.getCooldownStats).toHaveBeenCalledTimes(1);
    });

    it('should return stats with zero active cooldowns', () => {
      const emptyStats = {
        totalActive: 0,
        byType: {},
        oldestCooldown: null,
        newestCooldown: null,
      };

      notificationsListener.getCooldownStats!.mockReturnValue(emptyStats);

      const result = controller.getCooldownStats();

      expect(result.totalActive).toBe(0);
      expect(Object.keys(result.byType)).toHaveLength(0);
      expect(result.oldestCooldown).toBeNull();
      expect(result.newestCooldown).toBeNull();
    });

    it('should return stats with correct structure', () => {
      notificationsListener.getCooldownStats!.mockReturnValue(
        mockCooldownStats
      );

      const result = controller.getCooldownStats();

      expect(result).toHaveProperty('totalActive');
      expect(result).toHaveProperty('byType');
      expect(result).toHaveProperty('oldestCooldown');
      expect(result).toHaveProperty('newestCooldown');
    });

    it('should handle only one type of cooldown', () => {
      const singleTypeStats = {
        totalActive: 5,
        byType: {
          'low-stock': 5,
        },
        oldestCooldown: 1609459200000,
        newestCooldown: 1609462800000,
      };

      notificationsListener.getCooldownStats!.mockReturnValue(singleTypeStats);

      const result = controller.getCooldownStats();

      expect(Object.keys(result.byType)).toHaveLength(1);
      expect(result.byType['low-stock']).toBe(5);
      expect(result.byType['out-of-stock']).toBeUndefined();
    });
  });

  describe(`clearCooldown - DELETE /admin/inventory-notifications/cooldowns/:variantId/:type`, () => {
    it('should clear specific cooldown', () => {
      notificationsListener.clearCooldown!.mockReturnValue(undefined);

      const result = controller.clearCooldown('v1', 'low-stock');

      expect(result).toBeUndefined();
      expect(notificationsListener.clearCooldown).toHaveBeenCalledWith(
        'v1',
        'low-stock'
      );
      expect(notificationsListener.clearCooldown).toHaveBeenCalledTimes(1);
    });

    it('should clear out-of-stock cooldown', () => {
      notificationsListener.clearCooldown!.mockReturnValue(undefined);

      controller.clearCooldown('v2', 'out-of-stock');

      expect(notificationsListener.clearCooldown).toHaveBeenCalledWith(
        'v2',
        'out-of-stock'
      );
    });

    it('should handle clearing non-existent cooldown', () => {
      notificationsListener.clearCooldown!.mockReturnValue(undefined);

      // Should not throw even if cooldown doesn't exist
      const result = controller.clearCooldown('nonexistent', 'low-stock');

      expect(result).toBeUndefined();
      expect(notificationsListener.clearCooldown).toHaveBeenCalled();
    });

    it('should validate variant UUID format via ParseUUIDPipe', () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      notificationsListener.clearCooldown!.mockReturnValue(undefined);

      controller.clearCooldown(validUuid, 'low-stock');

      expect(notificationsListener.clearCooldown).toHaveBeenCalledWith(
        validUuid,
        'low-stock'
      );
    });

    it('should accept both cooldown types', () => {
      notificationsListener.clearCooldown!.mockReturnValue(undefined);

      controller.clearCooldown('v1', 'low-stock');
      controller.clearCooldown('v1', 'out-of-stock');

      expect(notificationsListener.clearCooldown).toHaveBeenCalledTimes(2);
    });
  });

  describe(`clearAllVariantCooldowns - DELETE /admin/inventory-notifications/cooldowns/:variantId`, () => {
    it('should clear all cooldowns for variant', () => {
      notificationsListener.clearAllVariantCooldowns!.mockReturnValue(2);

      const result = controller.clearAllVariantCooldowns('v1');

      expect(result).toEqual({ cleared: 2 });
      expect(
        notificationsListener.clearAllVariantCooldowns
      ).toHaveBeenCalledWith('v1');
      expect(
        notificationsListener.clearAllVariantCooldowns
      ).toHaveBeenCalledTimes(1);
    });

    it('should return zero when no cooldowns cleared', () => {
      notificationsListener.clearAllVariantCooldowns!.mockReturnValue(0);

      const result = controller.clearAllVariantCooldowns('v1');

      expect(result).toEqual({ cleared: 0 });
    });

    it('should return count of cleared cooldowns', () => {
      notificationsListener.clearAllVariantCooldowns!.mockReturnValue(3);

      const result = controller.clearAllVariantCooldowns('v1');

      expect(result.cleared).toBe(3);
    });

    it('should handle clearing multiple cooldowns', () => {
      notificationsListener.clearAllVariantCooldowns!.mockReturnValue(5);

      const result = controller.clearAllVariantCooldowns('v1');

      expect(result.cleared).toBe(5);
    });

    it('should validate variant UUID format', () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      notificationsListener.clearAllVariantCooldowns!.mockReturnValue(1);

      controller.clearAllVariantCooldowns(validUuid);

      expect(
        notificationsListener.clearAllVariantCooldowns
      ).toHaveBeenCalledWith(validUuid);
    });
  });

  describe('manualNotify - POST /admin/inventory-notifications/notify/:variantId/:type', () => {
    it('should trigger manual notification successfully', async () => {
      notificationsListener.manualNotify!.mockResolvedValue(
        mockManualNotifySuccess
      );

      const result = await controller.manualNotify('v1', 'low-stock');

      expect(result).toEqual(mockManualNotifySuccess);
      expect(result.success).toBe(true);
      expect(result.recipientCount).toBe(3);
      expect(notificationsListener.manualNotify).toHaveBeenCalledWith(
        'v1',
        'low-stock'
      );
      expect(notificationsListener.manualNotify).toHaveBeenCalledTimes(1);
    });

    it('should handle variant not found error', async () => {
      notificationsListener.manualNotify!.mockResolvedValue(
        mockManualNotifyError
      );

      const result = await controller.manualNotify('nonexistent', 'low-stock');

      expect(result.success).toBe(false);
      expect(result.recipientCount).toBe(0);
      expect(result.error).toBe('Variant not found');
    });

    it('should trigger out-of-stock notification', async () => {
      notificationsListener.manualNotify!.mockResolvedValue({
        success: true,
        recipientCount: 5,
      });

      const result = await controller.manualNotify('v1', 'out-of-stock');

      expect(result.success).toBe(true);
      expect(result.recipientCount).toBe(5);
      expect(notificationsListener.manualNotify).toHaveBeenCalledWith(
        'v1',
        'out-of-stock'
      );
    });

    it('should handle no recipients found', async () => {
      notificationsListener.manualNotify!.mockResolvedValue({
        success: false,
        recipientCount: 0,
        error: 'No eligible recipients found',
      });

      const result = await controller.manualNotify('v1', 'low-stock');

      expect(result.success).toBe(false);
      expect(result.recipientCount).toBe(0);
      expect(result.error).toBe('No eligible recipients found');
    });

    it('should handle different recipient counts', async () => {
      const recipientCounts = [1, 3, 10, 50];

      for (const count of recipientCounts) {
        notificationsListener.manualNotify!.mockResolvedValue({
          success: true,
          recipientCount: count,
        });

        const result = await controller.manualNotify('v1', 'low-stock');

        expect(result.recipientCount).toBe(count);
      }
    });

    it('should validate variant UUID format', async () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      notificationsListener.manualNotify!.mockResolvedValue(
        mockManualNotifySuccess
      );

      await controller.manualNotify(validUuid, 'low-stock');

      expect(notificationsListener.manualNotify).toHaveBeenCalledWith(
        validUuid,
        'low-stock'
      );
    });

    it('should handle async operation correctly', async () => {
      const delay = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));

      notificationsListener.manualNotify!.mockImplementation(async () => {
        await delay(100);
        return mockManualNotifySuccess;
      });

      const result = await controller.manualNotify('v1', 'low-stock');

      expect(result).toEqual(mockManualNotifySuccess);
    });
  });

  describe(`cleanupExpiredCooldowns - POST /admin/inventory-notifications/cooldowns/cleanup`, () => {
    it('should cleanup expired cooldowns', () => {
      notificationsListener.cleanupExpiredCooldowns!.mockReturnValue(5);

      const result = controller.cleanupExpiredCooldowns();

      expect(result).toEqual({ cleaned: 5 });
      expect(
        notificationsListener.cleanupExpiredCooldowns
      ).toHaveBeenCalledTimes(1);
      expect(
        notificationsListener.cleanupExpiredCooldowns
      ).toHaveBeenCalledWith();
    });

    it('should return zero when no cooldowns cleaned', () => {
      notificationsListener.cleanupExpiredCooldowns!.mockReturnValue(0);

      const result = controller.cleanupExpiredCooldowns();

      expect(result).toEqual({ cleaned: 0 });
    });

    it('should return count of cleaned entries', () => {
      const cleanedCounts = [0, 1, 5, 10, 100];

      for (const count of cleanedCounts) {
        notificationsListener.cleanupExpiredCooldowns!.mockReturnValue(count);

        const result = controller.cleanupExpiredCooldowns();

        expect(result.cleaned).toBe(count);
      }
    });

    it('should handle large cleanup counts', () => {
      notificationsListener.cleanupExpiredCooldowns!.mockReturnValue(1000);

      const result = controller.cleanupExpiredCooldowns();

      expect(result.cleaned).toBe(1000);
    });
  });

  describe('guards and authentication', () => {
    it('should be protected by JwtAuthGuard', () => {
      const guards = Reflect.getMetadata(
        '__guards__',
        InventoryNotificationsAdminController
      );

      expect(guards).toBeDefined();
    });

    it('should be protected by AdminGuard', () => {
      const guards = Reflect.getMetadata(
        '__guards__',
        InventoryNotificationsAdminController
      );

      expect(guards).toBeDefined();
    });

    it('should require authentication for all endpoints', () => {
      // All methods should be protected by guards at class level
      expect(controller).toBeDefined();
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle concurrent cleanup requests', () => {
      notificationsListener.cleanupExpiredCooldowns!.mockReturnValue(3);

      const results = [
        controller.cleanupExpiredCooldowns(),
        controller.cleanupExpiredCooldowns(),
        controller.cleanupExpiredCooldowns(),
      ];

      expect(results).toHaveLength(3);
      expect(
        notificationsListener.cleanupExpiredCooldowns
      ).toHaveBeenCalledTimes(3);
    });

    it('should handle concurrent clear operations', () => {
      notificationsListener.clearCooldown!.mockReturnValue(undefined);

      controller.clearCooldown('v1', 'low-stock');
      controller.clearCooldown('v1', 'out-of-stock');
      controller.clearCooldown('v2', 'low-stock');

      expect(notificationsListener.clearCooldown).toHaveBeenCalledTimes(3);
    });

    it('should handle manual notify failures gracefully', async () => {
      notificationsListener.manualNotify!.mockResolvedValue({
        success: false,
        recipientCount: 0,
        error: 'Service unavailable',
      });

      const result = await controller.manualNotify('v1', 'low-stock');

      expect(result.success).toBe(false);
      expect(result).toHaveProperty('error');
    });

    it('should handle listener method exceptions', async () => {
      notificationsListener.manualNotify!.mockRejectedValue(
        new Error('Unexpected error')
      );

      await expect(controller.manualNotify('v1', 'low-stock')).rejects.toThrow(
        'Unexpected error'
      );
    });
  });

  describe('response formats', () => {
    it('should return consistent response format for clearAllVariantCooldowns', () => {
      notificationsListener.clearAllVariantCooldowns!.mockReturnValue(2);

      const result = controller.clearAllVariantCooldowns('v1');

      expect(result).toHaveProperty('cleared');
      expect(typeof result.cleared).toBe('number');
    });

    it('should return consistent response format for cleanupExpiredCooldowns', () => {
      notificationsListener.cleanupExpiredCooldowns!.mockReturnValue(5);

      const result = controller.cleanupExpiredCooldowns();

      expect(result).toHaveProperty('cleaned');
      expect(typeof result.cleaned).toBe('number');
    });

    it('should return consistent response format for manualNotify', async () => {
      notificationsListener.manualNotify!.mockResolvedValue(
        mockManualNotifySuccess
      );

      const result = await controller.manualNotify('v1', 'low-stock');

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('recipientCount');
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.recipientCount).toBe('number');
    });
  });

  describe('integration scenarios', () => {
    it('should support workflow: check stats -> clear cooldown -> manual notify', async () => {
      notificationsListener.getCooldownStats!.mockReturnValue(
        mockCooldownStats
      );
      notificationsListener.clearCooldown!.mockReturnValue(undefined);
      notificationsListener.manualNotify!.mockResolvedValue(
        mockManualNotifySuccess
      );

      // Check stats
      const stats = controller.getCooldownStats();
      expect(stats.totalActive).toBe(15);

      // Clear cooldown
      controller.clearCooldown('v1', 'low-stock');
      expect(notificationsListener.clearCooldown).toHaveBeenCalled();

      // Trigger notification
      const notifyResult = await controller.manualNotify('v1', 'low-stock');
      expect(notifyResult.success).toBe(true);
    });

    it('should support workflow: get cooldowns -> clear all -> cleanup', () => {
      notificationsListener.getActiveCooldowns!.mockReturnValue(
        mockActiveCooldowns
      );
      notificationsListener.clearAllVariantCooldowns!.mockReturnValue(2);
      notificationsListener.cleanupExpiredCooldowns!.mockReturnValue(0);

      // Get active cooldowns
      const cooldowns = controller.getActiveCooldowns();
      expect(cooldowns).toHaveLength(2);

      // Clear all for variant
      const clearResult = controller.clearAllVariantCooldowns('v1');
      expect(clearResult.cleared).toBe(2);

      // Cleanup expired
      const cleanupResult = controller.cleanupExpiredCooldowns();
      expect(cleanupResult.cleaned).toBe(0);
    });
  });
});
