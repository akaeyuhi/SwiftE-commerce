import { Test, TestingModule } from '@nestjs/testing';
import { ConfirmationService } from 'src/modules/auth/confirmation/confirmation.service';
import { ConfirmationRepository } from 'src/modules/auth/confirmation/confirmation.repository';
import { UserService } from 'src/modules/user/user.service';
import { AdminService } from 'src/modules/admin/admin.service';
import { EmailQueueService } from 'src/modules/infrastructure/queues/email-queue/email-queue.service';
import { ConfirmationType } from 'src/modules/auth/confirmation/enums/confirmation.enum';
import { Confirmation } from 'src/modules/auth/confirmation/entities/confirmation.entity';
import { StoreRoles } from 'src/common/enums/store-roles.enum';
import { AdminRoles } from 'src/common/enums/admin.enum';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  createMock,
  createRepositoryMock,
  createServiceMock,
  MockedMethods,
} from '../../utils/helpers';

describe('ConfirmationService', () => {
  let service: ConfirmationService;
  let confirmationRepo: Partial<MockedMethods<ConfirmationRepository>>;
  let emailQueueService: Partial<MockedMethods<EmailQueueService>>;
  let userService: Partial<MockedMethods<UserService>>;
  let adminService: Partial<MockedMethods<AdminService>>;

  const mockUser = {
    id: 'u1',
    email: 'user@example.com',
    firstName: 'John',
    lastName: 'Doe',
  };

  const mockConfirmation: Confirmation = {
    id: 'c1',
    userId: 'u1',
    email: 'user@example.com',
    token: 'hashedToken',
    type: ConfirmationType.ACCOUNT_VERIFICATION,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    isUsed: false,
    usedAt: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
    metadata: {},
  } as Confirmation;

  beforeEach(async () => {
    confirmationRepo = createRepositoryMock<ConfirmationRepository>([
      'createEntity',
      'findByToken',
      'markAsUsed',
      'findPendingByUserAndType',
      'invalidateByUserAndType',
      'findPendingByUser',
      'getConfirmationStats',
      'performMaintenance',
      'updateEntity',
    ]);

    emailQueueService = createMock<EmailQueueService>([
      'sendUserConfirmation',
      'sendRoleConfirmation',
    ]);

    userService = createServiceMock<UserService>([
      'getEntityById',
      'markAsVerified',
      'assignStoreRole',
    ]);

    adminService = createServiceMock<AdminService>(['assignSiteAdminRole']);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfirmationService,
        { provide: ConfirmationRepository, useValue: confirmationRepo },
        { provide: EmailQueueService, useValue: emailQueueService },
        { provide: UserService, useValue: userService },
        { provide: AdminService, useValue: adminService },
      ],
    }).compile();

    service = module.get<ConfirmationService>(ConfirmationService);

    jest.clearAllMocks();
  });

  describe('sendAccountConfirmation', () => {
    it('should create confirmation and send email', async () => {
      userService.getEntityById!.mockResolvedValue(mockUser as any);
      confirmationRepo.createEntity!.mockResolvedValue(mockConfirmation);
      emailQueueService.sendUserConfirmation!.mockResolvedValue('job-1');

      await service.sendAccountConfirmation('u1', 'user@example.com');

      expect(confirmationRepo.createEntity).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'u1',
          email: 'user@example.com',
          type: ConfirmationType.ACCOUNT_VERIFICATION,
          isUsed: false,
        })
      );
      expect(emailQueueService.sendUserConfirmation).toHaveBeenCalled();
    });
  });

  describe('sendRoleConfirmation', () => {
    it('should send role confirmation for admin role', async () => {
      userService.getEntityById!.mockResolvedValue(mockUser as any);
      confirmationRepo.createEntity!.mockResolvedValue(mockConfirmation);
      emailQueueService.sendRoleConfirmation!.mockResolvedValue('job-2');

      await service.sendRoleConfirmation(
        'u1',
        'user@example.com',
        AdminRoles.ADMIN,
        { assignedBy: 'admin1' }
      );

      expect(confirmationRepo.createEntity).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ConfirmationType.SITE_ADMIN_ROLE,
          metadata: { assignedBy: 'admin1' },
        })
      );
      expect(emailQueueService.sendRoleConfirmation).toHaveBeenCalled();
    });

    it('should send role confirmation for store admin', async () => {
      userService.getEntityById!.mockResolvedValue(mockUser as any);
      confirmationRepo.createEntity!.mockResolvedValue(mockConfirmation);
      emailQueueService.sendRoleConfirmation!.mockResolvedValue('job-3');

      await service.sendRoleConfirmation(
        'u1',
        'user@example.com',
        StoreRoles.ADMIN,
        { storeId: 's1' }
      );

      expect(confirmationRepo.createEntity).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ConfirmationType.STORE_ADMIN_ROLE,
        })
      );
    });
  });

  describe('confirmToken', () => {
    it('should successfully confirm valid token', async () => {
      confirmationRepo.findByToken!.mockResolvedValue(mockConfirmation);
      confirmationRepo.markAsUsed!.mockResolvedValue(undefined);
      userService.markAsVerified!.mockResolvedValue(mockUser as any);

      const result = await service.confirmToken('token123');

      expect(result.success).toBe(true);
      expect(result.type).toBe(ConfirmationType.ACCOUNT_VERIFICATION);
      expect(result.userId).toBe('u1');
      expect(confirmationRepo.markAsUsed).toHaveBeenCalledWith('c1');
      expect(userService.markAsVerified).toHaveBeenCalledWith('u1');
    });

    it('should throw NotFoundException for invalid token', async () => {
      confirmationRepo.findByToken!.mockResolvedValue(null);

      await expect(service.confirmToken('invalidToken')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw BadRequestException for already used token', async () => {
      const usedConfirmation = { ...mockConfirmation, isUsed: true };
      confirmationRepo.findByToken!.mockResolvedValue(usedConfirmation);

      await expect(service.confirmToken('token123')).rejects.toThrow(
        BadRequestException
      );
      await expect(service.confirmToken('token123')).rejects.toThrow(
        'already been used'
      );
    });

    it('should throw BadRequestException for expired token', async () => {
      const expiredConfirmation = {
        ...mockConfirmation,
        expiresAt: new Date(Date.now() - 1000),
      };
      confirmationRepo.findByToken!.mockResolvedValue(expiredConfirmation);

      await expect(service.confirmToken('token123')).rejects.toThrow(
        'has expired'
      );
    });

    it('should process site admin role confirmation', async () => {
      const adminConfirmation = {
        ...mockConfirmation,
        type: ConfirmationType.SITE_ADMIN_ROLE,
        metadata: { assignedBy: 'admin1' },
      };
      confirmationRepo.findByToken!.mockResolvedValue(adminConfirmation);
      confirmationRepo.markAsUsed!.mockResolvedValue(undefined);
      adminService.assignSiteAdminRole!.mockResolvedValue(undefined as any);

      await service.confirmToken('token123');

      expect(adminService.assignSiteAdminRole).toHaveBeenCalledWith(
        'u1',
        'admin1'
      );
    });

    it('should process store admin role confirmation', async () => {
      const storeAdminConfirmation = {
        ...mockConfirmation,
        type: ConfirmationType.STORE_ADMIN_ROLE,
        metadata: { storeId: 's1', assignedBy: 'admin1' },
      };
      confirmationRepo.findByToken!.mockResolvedValue(storeAdminConfirmation);
      confirmationRepo.markAsUsed!.mockResolvedValue(undefined);
      userService.assignStoreRole!.mockResolvedValue(undefined as any);

      await service.confirmToken('token123');

      expect(userService.assignStoreRole).toHaveBeenCalledWith(
        'u1',
        's1',
        StoreRoles.ADMIN,
        'admin1'
      );
    });
  });

  describe('resendConfirmation', () => {
    it('should resend confirmation when allowed', async () => {
      userService.getEntityById!.mockResolvedValue(mockUser as any);
      const expiredConfirmation = {
        ...mockConfirmation,
        expiresAt: new Date(Date.now() - 1000),
      };
      confirmationRepo.findPendingByUserAndType!.mockResolvedValue(
        expiredConfirmation
      );
      confirmationRepo.invalidateByUserAndType!.mockResolvedValue(undefined);
      confirmationRepo.createEntity!.mockResolvedValue(mockConfirmation);
      emailQueueService.sendUserConfirmation!.mockResolvedValue('job-4');

      await service.resendConfirmation(
        'u1',
        ConfirmationType.ACCOUNT_VERIFICATION
      );

      expect(confirmationRepo.invalidateByUserAndType).toHaveBeenCalled();
      expect(emailQueueService.sendUserConfirmation).toHaveBeenCalled();
    });

    it('should throw BadRequestException if recent confirmation exists', async () => {
      userService.getEntityById!.mockResolvedValue(mockUser as any);
      confirmationRepo.findPendingByUserAndType!.mockResolvedValue(
        mockConfirmation
      );

      await expect(
        service.resendConfirmation('u1', ConfirmationType.ACCOUNT_VERIFICATION)
      ).rejects.toThrow('already sent recently');
    });

    it('should throw NotFoundException if user not found', async () => {
      userService.getEntityById!.mockResolvedValue(null);

      await expect(
        service.resendConfirmation('u1', ConfirmationType.ACCOUNT_VERIFICATION)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPendingConfirmations', () => {
    it('should return pending confirmations', async () => {
      const confirmations = [
        mockConfirmation,
        {
          ...mockConfirmation,
          id: 'c2',
          type: ConfirmationType.STORE_ADMIN_ROLE,
          metadata: { storeId: 's1' },
        },
      ];
      confirmationRepo.findPendingByUser!.mockResolvedValue(
        confirmations as any
      );

      const result = await service.getPendingConfirmations('u1');

      expect(result.accountVerification).toBe(true);
      expect(result.roleAssignments).toHaveLength(1);
      expect(result.roleAssignments[0].type).toBe(
        ConfirmationType.STORE_ADMIN_ROLE
      );
    });
  });

  describe('cancelPendingConfirmation', () => {
    it('should cancel pending confirmation', async () => {
      confirmationRepo.findPendingByUserAndType!.mockResolvedValue(
        mockConfirmation
      );
      confirmationRepo.markAsUsed!.mockResolvedValue(undefined);

      await service.cancelPendingConfirmation(
        'u1',
        ConfirmationType.ACCOUNT_VERIFICATION
      );

      expect(confirmationRepo.markAsUsed).toHaveBeenCalledWith('c1');
    });

    it('should throw NotFoundException if no pending confirmation', async () => {
      confirmationRepo.findPendingByUserAndType!.mockResolvedValue(null);

      await expect(
        service.cancelPendingConfirmation(
          'u1',
          ConfirmationType.ACCOUNT_VERIFICATION
        )
      ).rejects.toThrow('No pending confirmation found');
    });

    it('should throw BadRequestException if already used', async () => {
      const usedConfirmation = { ...mockConfirmation, isUsed: true };
      confirmationRepo.findPendingByUserAndType!.mockResolvedValue(
        usedConfirmation
      );

      await expect(
        service.cancelPendingConfirmation(
          'u1',
          ConfirmationType.ACCOUNT_VERIFICATION
        )
      ).rejects.toThrow('already been used');
    });
  });

  describe('getConfirmationStats', () => {
    it('should return confirmation statistics', async () => {
      const stats = {
        total: 100,
        byType: {
          [ConfirmationType.ACCOUNT_VERIFICATION]: 60,
          [ConfirmationType.SITE_ADMIN_ROLE]: 20,
          [ConfirmationType.STORE_ADMIN_ROLE]: 10,
          [ConfirmationType.STORE_MODERATOR_ROLE]: 5,
          [ConfirmationType.PASSWORD_RESET]: 5,
        },
        pending: 20,
        used: 75,
        expired: 5,
      };
      confirmationRepo.getConfirmationStats!.mockResolvedValue(stats);

      const result = await service.getConfirmationStats();

      expect(result).toEqual(stats);
    });
  });

  describe('performScheduledCleanup', () => {
    it('should perform scheduled cleanup successfully', async () => {
      const maintenanceStats = {
        expiredTokensDeleted: 10,
        oldUsedTokensDeleted: 5,
        totalCleaned: 15,
      };
      confirmationRepo.performMaintenance!.mockResolvedValue(maintenanceStats);

      const result = await service.performScheduledCleanup();

      expect(result.success).toBe(true);
      expect(result.stats).toEqual(maintenanceStats);
    });

    it('should handle cleanup errors', async () => {
      confirmationRepo.performMaintenance!.mockRejectedValue(
        new Error('Cleanup failed')
      );

      const result = await service.performScheduledCleanup();

      expect(result.success).toBe(false);
      expect(result.stats.totalCleaned).toBe(0);
    });
  });
});
