import { Test, TestingModule } from '@nestjs/testing';
import { ConfirmationCleanupService } from 'src/modules/auth/confirmation/confirmation-cleanup.service';
import { ConfirmationService } from 'src/modules/auth/confirmation/confirmation.service';
import { createMock, MockedMethods } from 'test/unit/helpers';

describe('ConfirmationCleanupService', () => {
  let service: ConfirmationCleanupService;
  let confirmationService: Partial<MockedMethods<ConfirmationService>>;

  beforeEach(async () => {
    confirmationService = createMock<ConfirmationService>([
      'performScheduledCleanup',
      'getConfirmationStats',
    ]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfirmationCleanupService,
        { provide: ConfirmationService, useValue: confirmationService },
      ],
    }).compile();

    service = module.get<ConfirmationCleanupService>(
      ConfirmationCleanupService
    );

    jest.clearAllMocks();
  });

  describe('handleDailyCleanup', () => {
    it('should perform daily cleanup successfully', async () => {
      const cleanupResult = {
        success: true,
        stats: {
          expiredTokensDeleted: 10,
          oldUsedTokensDeleted: 5,
          totalCleaned: 15,
        },
      };
      confirmationService.performScheduledCleanup!.mockResolvedValue(
        cleanupResult
      );

      await service.handleDailyCleanup();

      expect(confirmationService.performScheduledCleanup).toHaveBeenCalled();
    });

    it('should handle cleanup failure', async () => {
      const cleanupResult = {
        success: false,
        stats: {
          expiredTokensDeleted: 0,
          oldUsedTokensDeleted: 0,
          totalCleaned: 0,
        },
      };
      confirmationService.performScheduledCleanup!.mockResolvedValue(
        cleanupResult
      );

      await service.handleDailyCleanup();

      expect(confirmationService.performScheduledCleanup).toHaveBeenCalled();
    });

    it('should handle cleanup errors', async () => {
      confirmationService.performScheduledCleanup!.mockRejectedValue(
        new Error('Cleanup error')
      );

      await expect(service.handleDailyCleanup()).resolves.not.toThrow();
    });
  });

  describe('collectStats', () => {
    it('should collect stats successfully', async () => {
      const stats = {
        total: 100,
        byType: {} as any,
        pending: 20,
        used: 75,
        expired: 5,
      };
      confirmationService.getConfirmationStats!.mockResolvedValue(stats);

      await service.collectStats();

      expect(confirmationService.getConfirmationStats).toHaveBeenCalled();
    });

    it('should warn when expired tokens exceed threshold', async () => {
      const stats = {
        total: 2000,
        byType: {} as any,
        pending: 500,
        used: 500,
        expired: 1001, // Above threshold
      };
      confirmationService.getConfirmationStats!.mockResolvedValue(stats);

      await service.collectStats();

      expect(confirmationService.getConfirmationStats).toHaveBeenCalled();
    });

    it('should handle stats collection errors', async () => {
      confirmationService.getConfirmationStats!.mockRejectedValue(
        new Error('Stats error')
      );

      await expect(service.collectStats()).resolves.not.toThrow();
    });
  });
});
