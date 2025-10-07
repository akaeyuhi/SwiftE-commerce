import { Test, TestingModule } from '@nestjs/testing';
import { EmailController } from 'src/modules/email/email.controller';
import { EmailService } from 'src/modules/email/email.service';
import { EmailQueueService } from 'src/modules/infrastructure/queues/email-queue/email-queue.service';
import { JwtAuthGuard } from 'src/modules/authorization/guards/jwt-auth.guard';
import { AdminGuard } from 'src/modules/authorization/guards/admin.guard';
import { StoreRolesGuard } from 'src/modules/authorization/guards/store-roles.guard';
import { BadRequestException } from '@nestjs/common';
import {
  SendEmailDto,
  SendUserConfirmationDto,
  SendWelcomeEmailDto,
  SendStockAlertDto,
  SendLowStockWarningDto,
} from 'src/modules/email/dto/email.dto';
import {
  createGuardMock,
  createMock,
  createPolicyMock,
  MockedMethods,
} from 'test/unit/helpers';
import { PolicyService } from 'src/modules/authorization/policy/policy.service';
import { AdminRoles } from 'src/common/enums/admin.enum';
import { StoreRoles } from 'src/common/enums/store-roles.enum';
import { STORE_ROLES_META } from 'src/common/decorators/store-role.decorator';
import { ADMIN_ROLE_META } from 'src/common/decorators/admin-role.decorator';

describe('EmailController', () => {
  let controller: EmailController;
  let emailService: Partial<MockedMethods<EmailService>>;
  let emailQueueService: Partial<MockedMethods<EmailQueueService>>;
  let policyMock: Partial<MockedMethods<PolicyService>>;

  beforeEach(async () => {
    const guardMock = createGuardMock();

    emailService = createMock<EmailService>(['sendEmail', 'healthCheck']);
    policyMock = createPolicyMock();

    emailQueueService = createMock<EmailQueueService>([
      'sendUserConfirmation',
      'sendWelcomeEmail',
      'sendStockAlert',
      'sendLowStockWarning',
      'getStats',
    ]);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmailController],
      providers: [
        { provide: PolicyService, useValue: policyMock },
        { provide: EmailService, useValue: emailService },
        { provide: EmailQueueService, useValue: emailQueueService },
        { provide: JwtAuthGuard, useValue: guardMock },
        { provide: AdminGuard, useValue: guardMock },
        { provide: StoreRolesGuard, useValue: guardMock },
      ],
    }).compile();

    controller = module.get<EmailController>(EmailController);

    jest.clearAllMocks();
  });

  describe('sendEmail', () => {
    it('should send custom email successfully', async () => {
      const dto: SendEmailDto = {
        to: [{ email: 'user@example.com', name: 'User' }],
        subject: 'Test Email',
        html: '<p>Test content</p>',
        text: 'Test content',
      } as SendEmailDto;

      const emailResult = {
        success: true,
        messageId: 'msg-123',
        provider: 'smtp',
        sentAt: new Date(),
      };

      emailService.sendEmail!.mockResolvedValue(emailResult as any);

      const result = await controller.sendEmail(dto);

      expect(emailService.sendEmail).toHaveBeenCalledWith(dto);
      expect(result.success).toBe(true);
      expect(result.data.messageId).toBe('msg-123');
      expect(result.data.provider).toBe('smtp');
      expect(result.data.sentAt).toBeDefined();
    });

    it('should handle email service errors', async () => {
      const dto: SendEmailDto = {
        to: [{ email: 'user@example.com' }],
        subject: 'Test',
        html: '<p>Test</p>',
      } as SendEmailDto;

      emailService.sendEmail!.mockRejectedValue(new Error('Email failed'));

      await expect(controller.sendEmail(dto)).rejects.toThrow('Email failed');
      expect(emailService.sendEmail).toHaveBeenCalledWith(dto);
    });
  });

  describe('sendUserConfirmation', () => {
    it('should queue user confirmation email successfully', async () => {
      const dto: SendUserConfirmationDto = {
        userEmail: 'user@example.com',
        userName: 'John Doe',
        confirmationUrl: 'https://example.com/confirm',
        storeName: 'Test Store',
      };

      emailQueueService.sendUserConfirmation!.mockResolvedValue('job-123');

      const result = await controller.sendUserConfirmation(dto);

      expect(emailQueueService.sendUserConfirmation).toHaveBeenCalledWith(
        dto.userEmail,
        dto.userName,
        dto.confirmationUrl,
        dto.storeName
      );
      expect(result.success).toBe(true);
      expect(result.data.jobId).toBe('job-123');
      expect(result.data.scheduledAt).toBeDefined();
    });

    it('should throw BadRequestException on queue error', async () => {
      const dto: SendUserConfirmationDto = {
        userEmail: 'user@example.com',
        userName: 'John Doe',
        confirmationUrl: 'https://example.com/confirm',
        storeName: 'Test Store',
      };

      emailQueueService.sendUserConfirmation!.mockRejectedValue(
        new Error('Queue failed')
      );

      await expect(controller.sendUserConfirmation(dto)).rejects.toThrow(
        BadRequestException
      );
      await expect(controller.sendUserConfirmation(dto)).rejects.toThrow(
        'Failed to schedule confirmation email: Queue failed'
      );
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should queue welcome email successfully', async () => {
      const dto: SendWelcomeEmailDto = {
        userEmail: 'user@example.com',
        userName: 'John Doe',
        storeUrl: 'https://store.example.com',
        storeName: 'Test Store',
      };

      emailQueueService.sendWelcomeEmail!.mockResolvedValue('job-456');

      const result = await controller.sendWelcomeEmail(dto);

      expect(emailQueueService.sendWelcomeEmail).toHaveBeenCalledWith(
        dto.userEmail,
        dto.userName,
        dto.storeUrl,
        dto.storeName
      );
      expect(result.success).toBe(true);
      expect(result.data.jobId).toBe('job-456');
    });

    it('should throw BadRequestException on queue error', async () => {
      const dto: SendWelcomeEmailDto = {
        userEmail: 'user@example.com',
        userName: 'John Doe',
        storeUrl: 'https://store.example.com',
        storeName: 'Test Store',
      };

      emailQueueService.sendWelcomeEmail!.mockRejectedValue(
        new Error('Welcome email failed')
      );

      await expect(controller.sendWelcomeEmail(dto)).rejects.toThrow(
        'Failed to schedule welcome email: Welcome email failed'
      );
    });
  });

  describe('sendStockAlert', () => {
    it('should queue stock alert successfully', async () => {
      const dto: SendStockAlertDto = {
        userEmail: 'user@example.com',
        userName: 'John Doe',
        productData: {
          name: 'Product 1',
          price: '$99.99',
          stockQuantity: 5,
          url: 'https://example.com/product',
          image: 'https://example.com/image.jpg',
        },
      };

      emailQueueService.sendStockAlert!.mockResolvedValue('job-789');

      const result = await controller.sendStockAlert(dto);

      expect(emailQueueService.sendStockAlert).toHaveBeenCalledWith(
        dto.userEmail,
        dto.userName,
        dto.productData
      );
      expect(result.success).toBe(true);
      expect(result.data.jobId).toBe('job-789');
    });

    it('should throw BadRequestException on queue error', async () => {
      const dto: SendStockAlertDto = {
        userEmail: 'user@example.com',
        userName: 'John Doe',
        productData: {
          name: 'Product 1',
          price: '$99.99',
          stockQuantity: 5,
          url: 'https://example.com/product',
        },
      };

      emailQueueService.sendStockAlert!.mockRejectedValue(
        new Error('Stock alert failed')
      );

      await expect(controller.sendStockAlert(dto)).rejects.toThrow(
        'Failed to schedule stock alert: Stock alert failed'
      );
    });
  });

  describe('sendLowStockWarning', () => {
    it('should queue low stock warning successfully', async () => {
      const dto: SendLowStockWarningDto = {
        storeOwnerEmail: 'owner@example.com',
        storeOwnerName: 'Store Owner',
        productData: {
          name: 'Product 1',
          sku: 'SKU-001',
          category: 'Electronics',
          currentStock: 5,
          threshold: 10,
          recentSales: 15,
          estimatedDays: 3,
        },
        manageInventoryUrl: 'https://example.com/inventory',
      };

      emailQueueService.sendLowStockWarning!.mockResolvedValue('job-101');

      const result = await controller.sendLowStockWarning(dto);

      expect(emailQueueService.sendLowStockWarning).toHaveBeenCalledWith(
        dto.storeOwnerEmail,
        dto.storeOwnerName,
        dto.productData,
        dto.manageInventoryUrl
      );
      expect(result.success).toBe(true);
      expect(result.data.jobId).toBe('job-101');
    });

    it('should throw BadRequestException on queue error', async () => {
      const dto: SendLowStockWarningDto = {
        storeOwnerEmail: 'owner@example.com',
        storeOwnerName: 'Store Owner',
        productData: {
          name: 'Product 1',
          sku: 'SKU-001',
          category: 'Electronics',
          currentStock: 5,
          threshold: 10,
          recentSales: 15,
          estimatedDays: 3,
        },
        manageInventoryUrl: 'https://example.com/inventory',
      };

      emailQueueService.sendLowStockWarning!.mockRejectedValue(
        new Error('Low stock warning failed')
      );

      await expect(controller.sendLowStockWarning(dto)).rejects.toThrow(
        'Failed to schedule low stock warning: Low stock warning failed'
      );
    });
  });

  describe('healthCheck', () => {
    it('should return health check status successfully', async () => {
      const healthData = {
        healthy: true,
        providers: [
          { name: 'sendgrid', healthy: true },
          { name: 'smtp', healthy: true },
        ],
      };

      const queueStats = {
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
        delayed: 0,
        paused: 0,
        total: 0,
      };

      emailService.healthCheck!.mockResolvedValue(healthData);
      emailQueueService.getStats!.mockResolvedValue(queueStats);

      const result = await controller.healthCheck();

      expect(emailService.healthCheck).toHaveBeenCalled();
      expect(emailQueueService.getStats).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.data.service).toBe('email');
      expect(result.data.healthy).toBe(true);
      expect(result.data.timestamp).toBeDefined();
    });

    it('should handle health check errors gracefully', async () => {
      emailService.healthCheck!.mockRejectedValue(
        new Error('Health check failed')
      );

      const result = await controller.healthCheck();

      expect(result.success).toBe(false);
      expect(result.data.healthy).toBe(false);
      expect(result.data.error).toBe('Health check failed');
      expect(result.data.timestamp).toBeDefined();
    });
  });

  describe('getQueueStats', () => {
    it('should return queue statistics successfully', async () => {
      const stats = {
        waiting: 10,
        active: 3,
        completed: 500,
        failed: 15,
        delayed: 2,
        paused: 0,
        total: 0,
      };

      emailQueueService.getStats!.mockResolvedValue(stats);

      const result = await controller.getQueueStats();

      expect(emailQueueService.getStats).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.data.queue).toBe('email');
      expect(result.data.stats).toEqual(stats);
      expect(result.data.retrievedAt).toBeDefined();
    });

    it('should throw BadRequestException on stats error', async () => {
      emailQueueService.getStats!.mockRejectedValue(new Error('Stats failed'));

      await expect(controller.getQueueStats()).rejects.toThrow(
        BadRequestException
      );
      await expect(controller.getQueueStats()).rejects.toThrow(
        'Failed to get queue stats: Stats failed'
      );
    });
  });

  describe('error handling', () => {
    it('should handle undefined errors in sendUserConfirmation', async () => {
      const dto: SendUserConfirmationDto = {
        userEmail: 'user@example.com',
        userName: 'John Doe',
        confirmationUrl: 'https://example.com/confirm',
        storeName: 'Test Store',
      };

      emailQueueService.sendUserConfirmation!.mockRejectedValue({
        message: undefined,
      });

      await expect(controller.sendUserConfirmation(dto)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should handle service method calls with correct parameters', async () => {
      const dto: SendUserConfirmationDto = {
        userEmail: 'test@example.com',
        userName: 'Test User',
        confirmationUrl: 'https://example.com/confirm',
        storeName: 'Test Store',
      };

      emailQueueService.sendUserConfirmation!.mockResolvedValue('job-id');

      await controller.sendUserConfirmation(dto);

      expect(emailQueueService.sendUserConfirmation).toHaveBeenCalledTimes(1);
      expect(emailQueueService.sendUserConfirmation).toHaveBeenCalledWith(
        'test@example.com',
        'Test User',
        'https://example.com/confirm',
        'Test Store'
      );
    });
  });

  describe('guard protection', () => {
    it('should be protected by JwtAuthGuard', () => {
      const guards = Reflect.getMetadata('__guards__', EmailController);
      expect(guards).toBeDefined();
    });

    it('should have admin-only endpoints protected', () => {
      // sendEmail should require admin role
      const sendEmailMetadata = Reflect.getMetadata(
        ADMIN_ROLE_META,
        controller.sendEmail
      );
      expect(sendEmailMetadata).toBeDefined();
    });

    it('should have store role endpoints protected', () => {
      // sendUserConfirmation should require store admin/moderator
      const roleMetadata = Reflect.getMetadata(
        STORE_ROLES_META,
        controller.sendUserConfirmation
      );
      expect(roleMetadata).toBeDefined();
    });
  });
});
