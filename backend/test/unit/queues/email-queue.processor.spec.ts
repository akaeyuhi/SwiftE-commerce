import { Test, TestingModule } from '@nestjs/testing';
import { ModuleRef } from '@nestjs/core';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { EmailQueueProcessor } from 'src/modules/infrastructure/queues/email-queue/email-queue.processor';
import { EmailJobType } from 'src/common/enums/email.enum';
import { createMock, MockedMethods } from '../utils/helpers';

describe('EmailQueueProcessor', () => {
  let processor: EmailQueueProcessor;
  let moduleRef: Partial<MockedMethods<ModuleRef>>;
  let mockEmailService: any;

  const createMockJob = (data: any): Partial<Job> => ({
    id: 'job-1',
    data,
    progress: jest.fn().mockResolvedValue(undefined),
    name: 'test-job',
    failedReason: 'Test failure',
    attemptsMade: 1,
  });

  beforeEach(async () => {
    mockEmailService = {
      sendEmail: jest.fn().mockResolvedValue({
        messageId: 'msg-123',
        provider: 'sendgrid',
        sentAt: new Date().toISOString(),
      }),
    };

    moduleRef = createMock<ModuleRef>(['get']);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailQueueProcessor,
        { provide: ModuleRef, useValue: moduleRef },
      ],
    }).compile();

    processor = module.get<EmailQueueProcessor>(EmailQueueProcessor);

    // Setup moduleRef mock
    moduleRef.get!.mockImplementation((token: any) => {
      if (token.name === 'EmailService') {
        return mockEmailService;
      }
      return null;
    });

    // Suppress logger output
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(processor).toBeDefined();
    });
  });

  describe('handleUserConfirmation', () => {
    it('should process user confirmation email', async () => {
      const job = createMockJob({
        type: EmailJobType.USER_CONFIRMATION,
        emailData: {
          to: [{ email: 'user@example.com', name: 'John Doe' }],
          templateId: 'user_confirmation',
          templateData: {},
        },
      });

      jest
        .spyOn(processor as any, 'getEmailService')
        .mockResolvedValue(mockEmailService);

      const result = await processor.handleUserConfirmation(job as Job);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg-123');
      expect(result.jobType).toBe(EmailJobType.USER_CONFIRMATION);
      expect(mockEmailService.sendEmail).toHaveBeenCalled();
    });
  });

  describe('handleWelcome', () => {
    it('should process welcome email', async () => {
      const job = createMockJob({
        type: EmailJobType.WELCOME,
        emailData: { to: [], templateId: 'welcome' },
      });

      jest
        .spyOn(processor as any, 'getEmailService')
        .mockResolvedValue(mockEmailService);

      const result = await processor.handleWelcome(job as Job);

      expect(result.success).toBe(true);
      expect(result.jobType).toBe(EmailJobType.WELCOME);
    });
  });

  describe('handlePasswordReset', () => {
    it('should process password reset email', async () => {
      const job = createMockJob({
        type: EmailJobType.PASSWORD_RESET,
        emailData: { to: [], templateId: 'password_reset' },
      });

      jest
        .spyOn(processor as any, 'getEmailService')
        .mockResolvedValue(mockEmailService);

      const result = await processor.handlePasswordReset(job as Job);

      expect(result.success).toBe(true);
      expect(result.jobType).toBe(EmailJobType.PASSWORD_RESET);
    });
  });

  describe('handleRoleConfirmation', () => {
    it('should process role confirmation email', async () => {
      const job = createMockJob({
        type: EmailJobType.ROLE_CONFIRMATION,
        emailData: { to: [], templateId: 'role_confirmation' },
      });

      jest
        .spyOn(processor as any, 'getEmailService')
        .mockResolvedValue(mockEmailService);

      const result = await processor.handleRoleConfirmation(job as Job);

      expect(result.success).toBe(true);
      expect(result.jobType).toBe(EmailJobType.ROLE_CONFIRMATION);
    });
  });

  describe('handleOrderConfirmation', () => {
    it('should process order confirmation email', async () => {
      const job = createMockJob({
        type: EmailJobType.ORDER_CONFIRMATION,
        emailData: { to: [], templateId: 'order_confirmation' },
      });

      jest
        .spyOn(processor as any, 'getEmailService')
        .mockResolvedValue(mockEmailService);

      const result = await processor.handleOrderConfirmation(job as Job);

      expect(result.success).toBe(true);
      expect(result.jobType).toBe(EmailJobType.ORDER_CONFIRMATION);
    });
  });

  describe('handleStockAlert', () => {
    it('should process stock alert email', async () => {
      const job = createMockJob({
        type: EmailJobType.STOCK_ALERT,
        emailData: { to: [], templateId: 'stock_alert' },
      });

      jest
        .spyOn(processor as any, 'getEmailService')
        .mockResolvedValue(mockEmailService);

      const result = await processor.handleStockAlert(job as Job);

      expect(result.success).toBe(true);
      expect(result.jobType).toBe(EmailJobType.STOCK_ALERT);
    });
  });

  describe('handleLowStockWarning', () => {
    it('should process low stock warning email', async () => {
      const job = createMockJob({
        type: EmailJobType.LOW_STOCK_WARNING,
        emailData: { to: [], templateId: 'low_stock_warning' },
      });

      jest
        .spyOn(processor as any, 'getEmailService')
        .mockResolvedValue(mockEmailService);

      const result = await processor.handleLowStockWarning(job as Job);

      expect(result.success).toBe(true);
      expect(result.jobType).toBe(EmailJobType.LOW_STOCK_WARNING);
    });
  });

  describe('handleNewsletter', () => {
    it('should process newsletter email', async () => {
      const job = createMockJob({
        type: EmailJobType.NEWSLETTER,
        emailData: { to: [], templateId: 'newsletter' },
      });

      jest
        .spyOn(processor as any, 'getEmailService')
        .mockResolvedValue(mockEmailService);

      const result = await processor.handleNewsletter(job as Job);

      expect(result.success).toBe(true);
      expect(result.jobType).toBe(EmailJobType.NEWSLETTER);
    });
  });

  describe('handleMarketing', () => {
    it('should process marketing email', async () => {
      const job = createMockJob({
        type: EmailJobType.MARKETING,
        emailData: { to: [], templateId: 'marketing' },
      });

      jest
        .spyOn(processor as any, 'getEmailService')
        .mockResolvedValue(mockEmailService);

      const result = await processor.handleMarketing(job as Job);

      expect(result.success).toBe(true);
      expect(result.jobType).toBe(EmailJobType.MARKETING);
    });
  });

  describe('handleNotification', () => {
    it('should process notification email', async () => {
      const job = createMockJob({
        type: EmailJobType.NOTIFICATION,
        emailData: { to: [], templateId: 'notification' },
      });

      jest
        .spyOn(processor as any, 'getEmailService')
        .mockResolvedValue(mockEmailService);

      const result = await processor.handleNotification(job as Job);

      expect(result.success).toBe(true);
      expect(result.jobType).toBe(EmailJobType.NOTIFICATION);
    });
  });

  describe('processEmailJob', () => {
    it('should update progress throughout processing', async () => {
      const job = createMockJob({
        type: EmailJobType.WELCOME,
        emailData: { to: [], templateId: 'welcome' },
      });

      jest
        .spyOn(processor as any, 'getEmailService')
        .mockResolvedValue(mockEmailService);

      await (processor as any).processEmailJob(job, EmailJobType.WELCOME);

      expect(job.progress).toHaveBeenCalledWith(10);
      expect(job.progress).toHaveBeenCalledWith(30);
      expect(job.progress).toHaveBeenCalledWith(100);
    });

    it('should return success result', async () => {
      const job = createMockJob({
        type: EmailJobType.WELCOME,
        emailData: { to: [], templateId: 'welcome' },
      });

      jest
        .spyOn(processor as any, 'getEmailService')
        .mockResolvedValue(mockEmailService);

      const result = await (processor as any).processEmailJob(
        job,
        EmailJobType.WELCOME
      );

      expect(result).toEqual({
        success: true,
        messageId: 'msg-123',
        provider: 'sendgrid',
        sentAt: expect.any(String),
        jobId: 'job-1',
        jobType: EmailJobType.WELCOME,
      });
    });

    it('should handle email service errors', async () => {
      const job = createMockJob({
        type: EmailJobType.WELCOME,
        emailData: { to: [], templateId: 'welcome' },
      });

      mockEmailService.sendEmail.mockRejectedValue(
        new Error('Email service error')
      );
      jest
        .spyOn(processor as any, 'getEmailService')
        .mockResolvedValue(mockEmailService);

      await expect(
        (processor as any).processEmailJob(job, EmailJobType.WELCOME)
      ).rejects.toThrow('Email sending failed');
    });
  });

  describe('getEmailService', () => {
    it('should lazy load EmailService', async () => {
      const service = await (processor as any).getEmailService();

      expect(moduleRef.get).toHaveBeenCalled();
      expect(service).toBe(mockEmailService);
    });

    it('should handle service loading errors', async () => {
      moduleRef.get!.mockRejectedValue(new Error('Module not found') as never);

      await expect((processor as any).getEmailService()).rejects.toThrow(
        'EmailService not available'
      );
    });
  });

  describe('handleFailedJob', () => {
    it('should handle failed job', async () => {
      const job = createMockJob({
        type: EmailJobType.WELCOME,
        emailData: {},
      });

      const result = await processor.handleFailedJob(job as Job);

      expect(result.status).toBe('failed');
      expect(result.reason).toBe('Test failure');
      expect(result.attempts).toBe(1);
    });
  });

  describe('error handling', () => {
    it('should throw error with message', async () => {
      const job = createMockJob({
        type: EmailJobType.WELCOME,
        emailData: { to: [], templateId: 'welcome' },
      });

      mockEmailService.sendEmail.mockRejectedValue(
        new Error('SMTP connection failed')
      );
      jest
        .spyOn(processor as any, 'getEmailService')
        .mockResolvedValue(mockEmailService);

      await expect(
        (processor as any).processEmailJob(job, EmailJobType.WELCOME)
      ).rejects.toThrow('Email sending failed: SMTP connection failed');
    });

    it('should handle unknown errors', async () => {
      const job = createMockJob({
        type: EmailJobType.WELCOME,
        emailData: { to: [], templateId: 'welcome' },
      });

      mockEmailService.sendEmail.mockRejectedValue({ code: 'UNKNOWN' });
      jest
        .spyOn(processor as any, 'getEmailService')
        .mockResolvedValue(mockEmailService);

      await expect(
        (processor as any).processEmailJob(job, EmailJobType.WELCOME)
      ).rejects.toThrow('Email sending failed: Unknown error');
    });
  });
});
