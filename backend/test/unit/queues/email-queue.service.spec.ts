import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { Queue } from 'bull';
import { Logger } from '@nestjs/common';
import { EmailQueueService } from 'src/modules/infrastructure/queues/email-queue/email-queue.service';
import { EmailJobType, EmailPriority } from 'src/common/enums/email.enum';
import { AdminRoles } from 'src/common/enums/admin.enum';
import { StoreRoles } from 'src/common/enums/store-roles.enum';
import { createMock, MockedMethods } from 'test/unit/helpers';

describe('EmailQueueService', () => {
  let service: EmailQueueService;
  let queue: Partial<MockedMethods<Queue>>;

  const mockJob = {
    id: 'job-1',
    data: {},
    opts: {},
    remove: jest.fn(),
    retry: jest.fn(),
    attemptsMade: 0,
    finishedOn: Date.now(),
    processedOn: Date.now(),
  } as any;

  beforeEach(async () => {
    queue = createMock<Queue>([
      'add',
      'getJob',
      'getFailed',
      'getCompleted',
      'close',
    ]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailQueueService,
        {
          provide: getQueueToken('email'),
          useValue: queue,
        },
      ],
    }).compile();

    service = module.get<EmailQueueService>(EmailQueueService);

    // Suppress logger output
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should extend BaseQueueService', () => {
      expect(service).toBeInstanceOf(EmailQueueService);
    });

    it('should have queue name configured', () => {
      expect((service as any).queueName).toBe('email');
    });

    it('should have default options', () => {
      const defaultOptions = (service as any).defaultOptions;
      expect(defaultOptions.priority).toBe(EmailPriority.NORMAL);
      expect(defaultOptions.maxAttempts).toBe(3);
      expect(defaultOptions.backoff).toBe('exponential');
      expect(defaultOptions.backoffDelay).toBe(5000);
    });
  });

  describe('sendUserConfirmation', () => {
    it('should send user confirmation email', async () => {
      queue.add!.mockResolvedValue({ id: 'job-1' } as any);

      const jobId = await service.sendUserConfirmation(
        'user@example.com',
        'John Doe',
        'https://example.com/confirm',
        'Test Store'
      );

      expect(jobId).toBe('job-1');
      expect(queue.add).toHaveBeenCalledWith(
        EmailJobType.USER_CONFIRMATION,
        expect.objectContaining({
          type: EmailJobType.USER_CONFIRMATION,
          emailData: expect.objectContaining({
            to: [{ email: 'user@example.com', name: 'John Doe' }],
            templateId: 'user_confirmation',
            templateData: expect.objectContaining({
              userName: 'John Doe',
              storeName: 'Test Store',
              confirmationUrl: 'https://example.com/confirm',
              expirationHours: 24,
            }),
            priority: EmailPriority.HIGH,
            tags: ['user-confirmation', 'auth'],
          }),
        }),
        expect.objectContaining({
          priority: EmailPriority.HIGH,
        })
      );
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email', async () => {
      queue.add!.mockResolvedValue({ id: 'job-2' } as any);

      const jobId = await service.sendWelcomeEmail(
        'user@example.com',
        'John Doe',
        'https://store.example.com',
        'Test Store'
      );

      expect(jobId).toBe('job-2');
      expect(queue.add).toHaveBeenCalledWith(
        EmailJobType.WELCOME,
        expect.objectContaining({
          emailData: expect.objectContaining({
            templateId: 'welcome',
            templateData: expect.objectContaining({
              userName: 'John Doe',
              storeName: 'Test Store',
              storeUrl: 'https://store.example.com',
            }),
            tags: ['welcome', 'onboarding'],
          }),
        }),
        expect.any(Object)
      );
    });
  });

  describe('sendStockAlert', () => {
    it('should send stock alert email', async () => {
      queue.add!.mockResolvedValue({ id: 'job-3' } as any);

      const productData = {
        name: 'Product Name',
        price: '$99.99',
        stockQuantity: 5,
        url: 'https://example.com/product',
        image: 'https://example.com/image.jpg',
        description: 'Product description',
      };

      const jobId = await service.sendStockAlert(
        'user@example.com',
        'John Doe',
        productData
      );

      expect(jobId).toBe('job-3');
      expect(queue.add).toHaveBeenCalledWith(
        EmailJobType.STOCK_ALERT,
        expect.objectContaining({
          emailData: expect.objectContaining({
            templateId: 'stock_alert',
            templateData: expect.objectContaining({
              productName: 'Product Name',
              productPrice: '$99.99',
              stockQuantity: 5,
              productUrl: 'https://example.com/product',
              productImage: 'https://example.com/image.jpg',
            }),
            priority: EmailPriority.HIGH,
            tags: ['stock-alert', 'notification'],
          }),
        }),
        expect.objectContaining({
          priority: EmailPriority.HIGH,
        })
      );
    });
  });

  describe('sendLowStockWarning', () => {
    it('should send low stock warning email', async () => {
      queue.add!.mockResolvedValue({ id: 'job-4' } as any);

      const productData = {
        name: 'Product Name',
        sku: 'SKU-001',
        category: 'Electronics',
        currentStock: 5,
        threshold: 10,
        recentSales: 15,
        estimatedDays: 3,
      };

      const jobId = await service.sendLowStockWarning(
        'owner@example.com',
        'Store Owner',
        productData,
        'https://example.com/inventory'
      );

      expect(jobId).toBe('job-4');
      expect(queue.add).toHaveBeenCalledWith(
        EmailJobType.LOW_STOCK_WARNING,
        expect.objectContaining({
          emailData: expect.objectContaining({
            templateId: 'low_stock_warning',
            templateData: expect.objectContaining({
              productName: 'Product Name',
              productSku: 'SKU-001',
              currentStock: 5,
              stockThreshold: 10,
              estimatedDays: 3,
            }),
            tags: ['low-stock', 'inventory', 'warning'],
          }),
        }),
        expect.any(Object)
      );
    });
  });

  describe('sendRoleConfirmation', () => {
    it('should send role confirmation email with admin role', async () => {
      queue.add!.mockResolvedValue({ id: 'job-5' } as any);

      const jobId = await service.sendRoleConfirmation(
        'user@example.com',
        'John Doe',
        AdminRoles.ADMIN,
        'https://example.com/confirm-role',
        { storeName: 'Test Store', assignedBy: 'Admin' }
      );

      expect(jobId).toBe('job-5');
      expect(queue.add).toHaveBeenCalledWith(
        EmailJobType.ROLE_CONFIRMATION,
        expect.objectContaining({
          emailData: expect.objectContaining({
            templateId: 'role_confirmation',
            templateData: expect.objectContaining({
              roleType: AdminRoles.ADMIN,
              storeName: 'Test Store',
              assignedBy: 'Admin',
            }),
            tags: ['role-confirmation', 'auth'],
          }),
        }),
        expect.any(Object)
      );
    });

    it('should send role confirmation with store role', async () => {
      queue.add!.mockResolvedValue({ id: 'job-6' } as any);

      await service.sendRoleConfirmation(
        'user@example.com',
        'John Doe',
        StoreRoles.MODERATOR,
        'https://example.com/confirm-role'
      );

      expect(queue.add).toHaveBeenCalledWith(
        EmailJobType.ROLE_CONFIRMATION,
        expect.objectContaining({
          emailData: expect.objectContaining({
            templateData: expect.objectContaining({
              roleType: StoreRoles.MODERATOR,
            }),
          }),
        }),
        expect.any(Object)
      );
    });
  });

  describe('sendPasswordReset', () => {
    it('should send password reset email', async () => {
      queue.add!.mockResolvedValue({ id: 'job-7' } as any);

      const jobId = await service.sendPasswordReset(
        'user@example.com',
        'John Doe',
        'https://example.com/reset',
        30
      );

      expect(jobId).toBe('job-7');
      expect(queue.add).toHaveBeenCalledWith(
        EmailJobType.PASSWORD_RESET,
        expect.objectContaining({
          emailData: expect.objectContaining({
            templateId: 'password_reset',
            templateData: expect.objectContaining({
              userName: 'John Doe',
              resetUrl: 'https://example.com/reset',
              expirationMinutes: 30,
            }),
            tags: ['password-reset', 'security'],
          }),
        }),
        expect.any(Object)
      );
    });

    it('should use default expiration of 30 minutes', async () => {
      queue.add!.mockResolvedValue({ id: 'job-8' } as any);

      await service.sendPasswordReset(
        'user@example.com',
        'John Doe',
        'https://example.com/reset'
      );

      expect(queue.add).toHaveBeenCalledWith(
        EmailJobType.PASSWORD_RESET,
        expect.objectContaining({
          emailData: expect.objectContaining({
            templateData: expect.objectContaining({
              expirationMinutes: 30,
            }),
          }),
        }),
        expect.any(Object)
      );
    });
  });

  describe('sendOrderConfirmation', () => {
    it('should send order confirmation email', async () => {
      queue.add!.mockResolvedValue({ id: 'job-9' } as any);

      const orderData = {
        orderId: 'order-1',
        orderNumber: 'ORD-12345',
        totalAmount: 99.99,
        currency: 'USD',
        items: [{ name: 'Product 1', quantity: 2, price: 49.99 }],
        shippingAddress: '123 Main St',
        orderUrl: 'https://example.com/orders/order-1',
        storeName: 'Test Store',
        orderDate: '2025-10-01',
        shippingMethod: 'Standard',
      };

      const jobId = await service.sendOrderConfirmation(
        'customer@example.com',
        'John Doe',
        orderData
      );

      expect(jobId).toBe('job-9');
      expect(queue.add).toHaveBeenCalledWith(
        EmailJobType.ORDER_CONFIRMATION,
        expect.objectContaining({
          emailData: expect.objectContaining({
            templateId: 'order_confirmation',
            templateData: expect.objectContaining({
              orderNumber: 'ORD-12345',
              totalAmount: 99.99,
              itemCount: 1,
              hasMultipleItems: false,
            }),
            tags: ['order', 'confirmation'],
          }),
        }),
        expect.any(Object)
      );
    });

    it('should mark multiple items correctly', async () => {
      queue.add!.mockResolvedValue({ id: 'job-10' } as any);

      const orderData = {
        orderId: 'order-1',
        orderNumber: 'ORD-12345',
        totalAmount: 99.99,
        currency: 'USD',
        items: [
          { name: 'Product 1', quantity: 2, price: 49.99 },
          { name: 'Product 2', quantity: 1, price: 29.99 },
        ],
        orderUrl: 'https://example.com/orders/order-1',
      };

      await service.sendOrderConfirmation(
        'customer@example.com',
        'John Doe',
        orderData
      );

      expect(queue.add).toHaveBeenCalledWith(
        EmailJobType.ORDER_CONFIRMATION,
        expect.objectContaining({
          emailData: expect.objectContaining({
            templateData: expect.objectContaining({
              itemCount: 2,
              hasMultipleItems: true,
            }),
          }),
        }),
        expect.any(Object)
      );
    });
  });

  describe('sendOrderShipped', () => {
    it('should send order shipped email', async () => {
      queue.add!.mockResolvedValue({ id: 'job-11' } as any);

      const orderData = {
        orderId: 'order-1',
        orderNumber: 'ORD-12345',
        trackingNumber: 'TRACK123',
        trackingUrl: 'https://tracking.example.com',
        estimatedDeliveryDate: '2025-10-05',
        shippingMethod: 'Express',
        shippingAddress: '123 Main St',
        shippedDate: '2025-10-02',
        storeName: 'Test Store',
        items: [{ name: 'Product 1', quantity: 2 }],
      };

      const jobId = await service.sendOrderShipped(
        'customer@example.com',
        'John Doe',
        orderData
      );

      expect(jobId).toBe('job-11');
      expect(queue.add).toHaveBeenCalledWith(
        EmailJobType.ORDER_SHIPPED,
        expect.objectContaining({
          emailData: expect.objectContaining({
            templateId: 'order_shipped',
            templateData: expect.objectContaining({
              trackingNumber: 'TRACK123',
              hasTrackingNumber: true,
              hasEstimatedDelivery: true,
            }),
            tags: ['order', 'shipped'],
          }),
        }),
        expect.any(Object)
      );
    });

    it('should handle missing tracking information', async () => {
      queue.add!.mockResolvedValue({ id: 'job-12' } as any);

      const orderData = {
        orderId: 'order-1',
        orderNumber: 'ORD-12345',
        shippingAddress: '123 Main St',
        shippedDate: '2025-10-02',
        storeName: 'Test Store',
        items: [{ name: 'Product 1', quantity: 1 }],
      };

      await service.sendOrderShipped(
        'customer@example.com',
        'John Doe',
        orderData
      );

      expect(queue.add).toHaveBeenCalledWith(
        EmailJobType.ORDER_SHIPPED,
        expect.objectContaining({
          emailData: expect.objectContaining({
            templateData: expect.objectContaining({
              hasTrackingNumber: false,
              hasEstimatedDelivery: false,
            }),
          }),
        }),
        expect.any(Object)
      );
    });
  });

  describe('sendOrderDelivered', () => {
    it('should send order delivered email', async () => {
      queue.add!.mockResolvedValue({ id: 'job-13' } as any);

      const orderData = {
        orderId: 'order-1',
        orderNumber: 'ORD-12345',
        deliveredDate: '2025-10-05',
        shippingAddress: '123 Main St',
        reviewUrl: 'https://example.com/review',
        supportUrl: 'https://example.com/support',
        storeName: 'Test Store',
        items: [{ name: 'Product 1', quantity: 2 }],
      };

      const jobId = await service.sendOrderDelivered(
        'customer@example.com',
        'John Doe',
        orderData
      );

      expect(jobId).toBe('job-13');
      expect(queue.add).toHaveBeenCalledWith(
        EmailJobType.ORDER_DELIVERED,
        expect.objectContaining({
          emailData: expect.objectContaining({
            templateId: 'order_delivered',
            templateData: expect.objectContaining({
              reviewUrl: 'https://example.com/review',
              supportUrl: 'https://example.com/support',
            }),
            priority: EmailPriority.NORMAL,
            tags: ['order', 'delivered'],
          }),
        }),
        expect.any(Object)
      );
    });
  });

  describe('sendOrderCancelled', () => {
    it('should send order cancelled email', async () => {
      queue.add!.mockResolvedValue({ id: 'job-14' } as any);

      const orderData = {
        orderId: 'order-1',
        orderNumber: 'ORD-12345',
        cancelledDate: '2025-10-02',
        cancellationReason: 'Customer request',
        refundAmount: 99.99,
        refundMethod: 'Credit card',
        storeName: 'Test Store',
        items: [
          {
            productName: 'Product 1',
            sku: 'SKU-001',
            quantity: 2,
            unitPrice: 49.99,
            lineTotal: 99.98,
          },
        ],
      };

      const jobId = await service.sendOrderCancelled(
        'customer@example.com',
        'John Doe',
        orderData
      );

      expect(jobId).toBe('job-14');
      expect(queue.add).toHaveBeenCalledWith(
        EmailJobType.ORDER_CANCELLED,
        expect.objectContaining({
          emailData: expect.objectContaining({
            templateId: 'order_cancelled',
            templateData: expect.objectContaining({
              cancellationReason: 'Customer request',
              hasCancellationReason: true,
              refundAmount: 99.99,
              refundMethod: 'Credit card',
            }),
            tags: ['order', 'cancelled'],
          }),
        }),
        expect.any(Object)
      );
    });

    it('should handle missing cancellation reason', async () => {
      queue.add!.mockResolvedValue({ id: 'job-15' } as any);

      const orderData = {
        orderId: 'order-1',
        orderNumber: 'ORD-12345',
        cancelledDate: '2025-10-02',
        refundAmount: 99.99,
        storeName: 'Test Store',
        items: [],
      };

      await service.sendOrderCancelled(
        'customer@example.com',
        'John Doe',
        orderData
      );

      expect(queue.add).toHaveBeenCalledWith(
        EmailJobType.ORDER_CANCELLED,
        expect.objectContaining({
          emailData: expect.objectContaining({
            templateData: expect.objectContaining({
              hasCancellationReason: false,
              refundMethod: 'Original payment method',
            }),
          }),
        }),
        expect.any(Object)
      );
    });
  });

  describe('sendNewsNotification', () => {
    it('should send news notification email', async () => {
      queue.add!.mockResolvedValue({ id: 'job-16' } as any);

      const newsData = {
        newsId: 'news-1',
        title: 'Breaking News',
        excerpt: 'Short summary',
        content: 'Full content',
        authorName: 'Admin',
        publishedAt: '2025-10-01',
        newsUrl: 'https://example.com/news',
        coverImageUrl: 'https://example.com/cover.jpg',
        category: 'announcements',
        storeName: 'Test Store',
        unsubscribeUrl: 'https://example.com/unsubscribe',
      };

      const jobId = await service.sendNewsNotification(
        'user@example.com',
        'John Doe',
        newsData
      );

      expect(jobId).toBe('job-16');
      expect(queue.add).toHaveBeenCalledWith(
        EmailJobType.NEWS_PUBLISHED,
        expect.objectContaining({
          emailData: expect.objectContaining({
            templateId: 'news_published',
            templateData: expect.objectContaining({
              newsTitle: 'Breaking News',
              hasCoverImage: true,
              hasCategory: true,
              unsubscribeUrl: 'https://example.com/unsubscribe',
            }),
            tags: ['news', 'announcement'],
          }),
        }),
        expect.any(Object)
      );
    });
  });

  describe('queue management', () => {
    describe('scheduleRecurring', () => {
      it('should schedule recurring email job', async () => {
        queue.add!.mockResolvedValue({ id: 'recurring-1' } as any);

        const jobId = await service.scheduleRecurring(
          EmailJobType.NEWSLETTER,
          '0 9 * * 1',
          { type: EmailJobType.NEWSLETTER, emailData: {} as any }
        );

        expect(jobId).toBe('recurring-1');
        expect(queue.add).toHaveBeenCalledWith(
          EmailJobType.NEWSLETTER,
          expect.any(Object),
          expect.objectContaining({
            repeat: expect.objectContaining({
              cron: '0 9 * * 1',
            }),
          })
        );
      });
    });

    describe('retryFailed', () => {
      it('should retry failed jobs', async () => {
        const failedJob = {
          ...mockJob,
          id: 'failed-1',
          name: EmailJobType.ORDER_CONFIRMATION,
          attemptsMade: 1,
          opts: { attempts: 3 },
          retry: jest.fn(),
        };

        queue.getFailed!.mockResolvedValue([failedJob]);

        const retriedCount = await service.retryFailed();

        expect(retriedCount).toBe(1);
        expect(failedJob.retry).toHaveBeenCalled();
      });

      it('should filter by job type', async () => {
        const failedJobs = [
          {
            ...mockJob,
            name: EmailJobType.ORDER_CONFIRMATION,
            attemptsMade: 1,
            opts: { attempts: 3 },
            retry: jest.fn(),
          },
          {
            ...mockJob,
            name: EmailJobType.WELCOME,
            attemptsMade: 1,
            opts: { attempts: 3 },
            retry: jest.fn(),
          },
        ];

        queue.getFailed!.mockResolvedValue(failedJobs);

        await service.retryFailed(EmailJobType.ORDER_CONFIRMATION);

        expect(failedJobs[0].retry).toHaveBeenCalled();
        expect(failedJobs[1].retry).not.toHaveBeenCalled();
      });

      it('should not retry exhausted jobs', async () => {
        const exhaustedJob = {
          ...mockJob,
          attemptsMade: 3,
          opts: { attempts: 3 },
          retry: jest.fn(),
        };

        queue.getFailed!.mockResolvedValue([exhaustedJob]);

        const retriedCount = await service.retryFailed();

        expect(retriedCount).toBe(0);
        expect(exhaustedJob.retry).not.toHaveBeenCalled();
      });
    });

    describe('purgeCompleted', () => {
      it('should purge old completed jobs', async () => {
        const oldJob = {
          ...mockJob,
          finishedOn: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
          remove: jest.fn(),
        };

        const recentJob = {
          ...mockJob,
          finishedOn: Date.now() - 60 * 60 * 1000, // 1 hour ago
          remove: jest.fn(),
        };

        queue.getCompleted!.mockResolvedValue([oldJob, recentJob]);

        const purgedCount = await service.purgeCompleted(24);

        expect(purgedCount).toBe(1);
        expect(oldJob.remove).toHaveBeenCalled();
        expect(recentJob.remove).not.toHaveBeenCalled();
      });
    });
  });

  describe('convertToBullOptions', () => {
    it('should convert QueueOptions to Bull JobOptions', () => {
      const options = {
        priority: EmailPriority.HIGH,
        delay: 1000,
        maxAttempts: 5,
        backoff: 'exponential' as const,
        backoffDelay: 10000,
        removeOnComplete: 50,
        removeOnFail: 25,
        jobId: 'custom-id',
      };

      const bullOptions = (service as any).convertToBullOptions(options);

      expect(bullOptions.priority).toBe(EmailPriority.HIGH);
      expect(bullOptions.delay).toBe(1000);
      expect(bullOptions.attempts).toBe(5);
      expect(bullOptions.jobId).toBe('custom-id');
    });

    it('should handle empty options', () => {
      const bullOptions = (service as any).convertToBullOptions();

      expect(bullOptions).toEqual({});
    });

    it('should use default priority', () => {
      const bullOptions = (service as any).convertToBullOptions({});

      expect(bullOptions.priority).toBe(EmailPriority.NORMAL);
    });
  });
});
