import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, JobOptions } from 'bull';
import { BaseQueueService } from 'src/common/abstracts/infrastucture/base.queue.service';
import { QueueOptions } from 'src/common/interfaces/infrastructure/queue.interface';
import { AdminRoles } from 'src/common/enums/admin.enum';
import { EmailJobType, EmailPriority } from 'src/common/enums/email.enum';
import { EmailJobData } from 'src/common/interfaces/infrastructure/email.interface';
import { StoreRoles } from 'src/common/enums/store-roles.enum';

/**
 * EmailQueueService (Global)
 *
 * Pure infrastructure service - NO business logic dependencies.
 * Does NOT import EmailService - processing is done in EmailQueueProcessor.
 * All email sending is queued for async processing.
 */
@Injectable()
export class EmailQueueService extends BaseQueueService<EmailJobData> {
  protected readonly queueName = 'email';
  protected readonly logger = new Logger(EmailQueueService.name);

  protected readonly defaultOptions: QueueOptions = {
    priority: EmailPriority.NORMAL,
    maxAttempts: 3,
    backoff: 'exponential',
    backoffDelay: 5000,
  };

  constructor(@InjectQueue('email') protected readonly queue: Queue) {
    super(queue);
  }

  // ===============================
  // Queue Management
  // ===============================

  protected async addJob(
    jobType: string,
    data: EmailJobData,
    options?: QueueOptions
  ): Promise<string> {
    const bullOptions: JobOptions = this.convertToBullOptions(options);
    const job = await this.queue.add(jobType, data, bullOptions);
    return job.id.toString();
  }

  protected async processJob(
    jobType: string,
    data: EmailJobData,
    job: any
  ): Promise<any> {
    // This method is required by BaseQueueService but not used
    // Processing is done in EmailQueueProcessor
    this.logger.debug(`Job ${job.id} will be processed by processor`);
    return { jobType, data };
  }

  protected async removeJob(jobId: string): Promise<void> {
    const job = await this.queue.getJob(jobId);
    if (job) {
      await job.remove();
    }
  }

  // ===============================
  // Queue Utilities
  // ===============================

  async scheduleRecurring(
    jobType: string,
    cronExpression: string,
    data: EmailJobData
  ): Promise<string> {
    const job = await this.queue.add(jobType, data, {
      repeat: {
        cron: cronExpression,
        tz: process.env.TZ || 'UTC',
      },
      removeOnComplete: 100,
      removeOnFail: 50,
    });

    this.logger.log(
      `Scheduled recurring email job ${jobType}: ${cronExpression}`
    );
    return job.id.toString();
  }

  async retryFailed(jobType?: string): Promise<number> {
    const failedJobs = await this.queue.getFailed();
    let retriedCount = 0;

    for (const job of failedJobs) {
      if (jobType && job.name !== jobType) continue;

      const maxAttempts =
        job.opts.attempts || this.defaultOptions.maxAttempts || 3;
      if (job.attemptsMade < maxAttempts) {
        await job.retry();
        retriedCount++;
      }
    }

    this.logger.log(`Retried ${retriedCount} failed email jobs`);
    return retriedCount;
  }

  async purgeCompleted(olderThanHours: number): Promise<number> {
    const cutoffTime = Date.now() - olderThanHours * 60 * 60 * 1000;
    const completedJobs = await this.queue.getCompleted();
    let purgedCount = 0;

    for (const job of completedJobs) {
      const jobCompletedAt = job.finishedOn || job.processedOn;
      if (jobCompletedAt && jobCompletedAt < cutoffTime) {
        await job.remove();
        purgedCount++;
      }
    }

    this.logger.log(`Purged ${purgedCount} completed email jobs`);
    return purgedCount;
  }

  // ===============================
  // Public Email Queue API
  // ===============================

  /**
   * Send user confirmation email
   */
  async sendUserConfirmation(
    userEmail: string,
    userName: string,
    confirmationUrl: string,
    storeName: string,
    options?: QueueOptions
  ): Promise<string> {
    return this.scheduleJob(
      EmailJobType.USER_CONFIRMATION,
      {
        type: EmailJobType.USER_CONFIRMATION,
        emailData: {
          to: [{ email: userEmail, name: userName }],
          subject: '',
          html: '',
          templateId: 'user_confirmation',
          templateData: {
            userName,
            storeName,
            confirmationUrl,
            expirationHours: 24,
          },
          priority: EmailPriority.HIGH,
          tags: ['user-confirmation', 'auth'],
        },
      },
      { priority: EmailPriority.HIGH, ...options }
    );
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(
    userEmail: string,
    userName: string,
    storeUrl: string,
    storeName: string,
    options?: QueueOptions
  ): Promise<string> {
    return this.scheduleJob(
      EmailJobType.WELCOME,
      {
        type: EmailJobType.WELCOME,
        emailData: {
          to: [{ email: userEmail, name: userName }],
          subject: '',
          html: '',
          templateId: 'welcome',
          templateData: {
            userName,
            storeName,
            storeUrl,
          },
          priority: EmailPriority.NORMAL,
          tags: ['welcome', 'onboarding'],
        },
      },
      options
    );
  }

  /**
   * Send stock alert email
   */
  async sendStockAlert(
    userEmail: string,
    userName: string,
    productData: {
      name: string;
      price: string;
      stockQuantity: number;
      url: string;
      image?: string;
      description?: string;
    },
    options?: QueueOptions
  ): Promise<string> {
    return this.scheduleJob(
      EmailJobType.STOCK_ALERT,
      {
        type: EmailJobType.STOCK_ALERT,
        emailData: {
          to: [{ email: userEmail, name: userName }],
          subject: '',
          html: '',
          templateId: 'stock_alert',
          templateData: {
            userName,
            productName: productData.name,
            productPrice: productData.price,
            stockQuantity: productData.stockQuantity,
            productUrl: productData.url,
            productImage: productData.image,
            productDescription: productData.description,
          },
          priority: EmailPriority.HIGH,
          tags: ['stock-alert', 'notification'],
        },
      },
      { priority: EmailPriority.HIGH, ...options }
    );
  }

  /**
   * Send low stock warning email
   */
  async sendLowStockWarning(
    storeOwnerEmail: string,
    storeOwnerName: string,
    productData: {
      name: string;
      sku: string;
      category: string;
      currentStock: number;
      threshold: number;
      recentSales: number;
      estimatedDays: number;
    },
    manageInventoryUrl: string,
    options?: QueueOptions
  ): Promise<string> {
    return this.scheduleJob(
      EmailJobType.LOW_STOCK_WARNING,
      {
        type: EmailJobType.LOW_STOCK_WARNING,
        emailData: {
          to: [{ email: storeOwnerEmail, name: storeOwnerName }],
          subject: '',
          html: '',
          templateId: 'low_stock_warning',
          templateData: {
            storeOwnerName,
            productName: productData.name,
            productSku: productData.sku,
            productCategory: productData.category,
            currentStock: productData.currentStock,
            stockThreshold: productData.threshold,
            recentSales: productData.recentSales,
            estimatedDays: productData.estimatedDays,
            manageInventoryUrl,
          },
          priority: EmailPriority.HIGH,
          tags: ['low-stock', 'inventory', 'warning'],
        },
      },
      { priority: EmailPriority.HIGH, ...options }
    );
  }

  /**
   * Send role confirmation email
   */
  async sendRoleConfirmation(
    userEmail: string,
    userName: string,
    roleType: AdminRoles | StoreRoles,
    confirmationUrl: string,
    metadata?: Record<string, any>,
    options?: QueueOptions
  ): Promise<string> {
    return this.scheduleJob(
      EmailJobType.ROLE_CONFIRMATION,
      {
        type: EmailJobType.ROLE_CONFIRMATION,
        emailData: {
          to: [{ email: userEmail, name: userName }],
          subject: '',
          html: '',
          templateId: 'role_confirmation',
          templateData: {
            userName,
            roleType,
            confirmationUrl,
            storeName: metadata?.storeName || 'Store',
            assignedBy: metadata?.assignedBy,
            assignedAt: metadata?.assignedAt,
          },
          priority: EmailPriority.HIGH,
          tags: ['role-confirmation', 'auth'],
        },
      },
      { priority: EmailPriority.HIGH, ...options }
    );
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(
    userEmail: string,
    userName: string,
    resetUrl: string,
    expirationMinutes: number = 30,
    options?: QueueOptions
  ): Promise<string> {
    return this.scheduleJob(
      EmailJobType.PASSWORD_RESET,
      {
        type: EmailJobType.PASSWORD_RESET,
        emailData: {
          to: [{ email: userEmail, name: userName }],
          subject: '',
          html: '',
          templateId: 'password_reset',
          templateData: {
            userName,
            resetUrl,
            expirationMinutes,
          },
          priority: EmailPriority.HIGH,
          tags: ['password-reset', 'security'],
        },
      },
      { priority: EmailPriority.HIGH, ...options }
    );
  }

  async sendOrderConfirmation(
    userEmail: string,
    userName: string,
    orderData: {
      orderId: string;
      orderNumber: string;
      totalAmount: number;
      currency: string;
      items: Array<{
        name: string;
        quantity: number;
        price: number;
      }>;
      shippingAddress?: string;
      orderUrl: string;
      storeName?: string;
      orderDate?: string;
      shippingMethod?: string;
      deliveryInstructions?: string;
    },
    options?: QueueOptions
  ): Promise<string> {
    return this.scheduleJob(
      EmailJobType.ORDER_CONFIRMATION,
      {
        type: EmailJobType.ORDER_CONFIRMATION,
        emailData: {
          to: [{ email: userEmail, name: userName }],
          subject: '',
          html: '',
          templateId: 'order_confirmation',
          templateData: {
            userName,
            orderNumber: orderData.orderNumber,
            orderId: orderData.orderId,
            totalAmount: orderData.totalAmount,
            currency: orderData.currency,
            items: orderData.items,
            shippingAddress: orderData.shippingAddress,
            orderUrl: orderData.orderUrl,
            storeName: orderData.storeName,
            orderDate: orderData.orderDate,
            shippingMethod: orderData.shippingMethod,
            deliveryInstructions: orderData.deliveryInstructions,
            itemCount: orderData.items.length,
            hasMultipleItems: orderData.items.length > 1,
          },
          priority: EmailPriority.HIGH,
          tags: ['order', 'confirmation'],
        },
      },
      { priority: EmailPriority.HIGH, ...options }
    );
  }

  /**
   * Send order shipped email
   */
  async sendOrderShipped(
    userEmail: string,
    userName: string,
    orderData: {
      orderId: string;
      orderNumber: string;
      trackingNumber?: string;
      trackingUrl?: string;
      estimatedDeliveryDate?: string;
      shippingMethod?: string;
      shippingAddress: string;
      shippedDate: string;
      storeName: string;
      items: Array<{
        name: string;
        quantity: number;
      }>;
    },
    options?: QueueOptions
  ): Promise<string> {
    return this.scheduleJob(
      EmailJobType.ORDER_SHIPPED,
      {
        type: EmailJobType.ORDER_SHIPPED,
        emailData: {
          to: [{ email: userEmail, name: userName }],
          subject: '',
          html: '',
          templateId: 'order_shipped',
          templateData: {
            userName,
            orderNumber: orderData.orderNumber,
            orderId: orderData.orderId,
            trackingNumber: orderData.trackingNumber,
            trackingUrl: orderData.trackingUrl,
            hasTrackingNumber: !!orderData.trackingNumber,
            estimatedDeliveryDate: orderData.estimatedDeliveryDate,
            hasEstimatedDelivery: !!orderData.estimatedDeliveryDate,
            shippingMethod: orderData.shippingMethod,
            shippingAddress: orderData.shippingAddress,
            shippedDate: orderData.shippedDate,
            storeName: orderData.storeName,
            items: orderData.items,
            itemCount: orderData.items.length,
          },
          priority: EmailPriority.HIGH,
          tags: ['order', 'shipped'],
        },
      },
      { priority: EmailPriority.HIGH, ...options }
    );
  }

  /**
   * Send order delivered email
   */
  async sendOrderDelivered(
    userEmail: string,
    userName: string,
    orderData: {
      orderId: string;
      orderNumber: string;
      deliveredDate: string;
      shippingAddress: string;
      reviewUrl: string;
      supportUrl: string;
      storeName: string;
      items: Array<{
        name: string;
        quantity: number;
      }>;
    },
    options?: QueueOptions
  ): Promise<string> {
    return this.scheduleJob(
      EmailJobType.ORDER_DELIVERED,
      {
        type: EmailJobType.ORDER_DELIVERED,
        emailData: {
          to: [{ email: userEmail, name: userName }],
          subject: '',
          html: '',
          templateId: 'order_delivered',
          templateData: {
            userName,
            orderNumber: orderData.orderNumber,
            orderId: orderData.orderId,
            deliveredDate: orderData.deliveredDate,
            shippingAddress: orderData.shippingAddress,
            reviewUrl: orderData.reviewUrl,
            supportUrl: orderData.supportUrl,
            storeName: orderData.storeName,
            items: orderData.items,
            itemCount: orderData.items.length,
            hasMultipleItems: orderData.items.length > 1,
          },
          priority: EmailPriority.NORMAL,
          tags: ['order', 'delivered'],
        },
      },
      { priority: EmailPriority.NORMAL, ...options }
    );
  }

  /**
   * Send order cancelled email
   */
  async sendOrderCancelled(
    userEmail: string,
    userName: string,
    orderData: {
      orderId: string;
      orderNumber: string;
      cancelledDate: string;
      cancellationReason?: string;
      refundAmount: number;
      refundMethod?: string;
      storeName: string;
      items: Array<{
        productName: string;
        sku: string;
        quantity: number;
        unitPrice: number;
        lineTotal: number;
      }>;
    },
    options?: QueueOptions
  ): Promise<string> {
    return this.scheduleJob(
      EmailJobType.ORDER_CANCELLED,
      {
        type: EmailJobType.ORDER_CANCELLED,
        emailData: {
          to: [{ email: userEmail, name: userName }],
          subject: '',
          html: '',
          templateId: 'order_cancelled',
          templateData: {
            userName,
            orderNumber: orderData.orderNumber,
            orderId: orderData.orderId,
            cancelledDate: orderData.cancelledDate,
            cancellationReason: orderData.cancellationReason,
            hasCancellationReason: !!orderData.cancellationReason,
            refundAmount: orderData.refundAmount,
            refundMethod: orderData.refundMethod || 'Original payment method',
            storeName: orderData.storeName,
            items: orderData.items,
            itemCount: orderData.items.length,
          },
          priority: EmailPriority.HIGH,
          tags: ['order', 'cancelled'],
        },
      },
      { priority: EmailPriority.HIGH, ...options }
    );
  }

  /**
   * Send news notification email
   */
  async sendNewsNotification(
    userEmail: string,
    userName: string,
    newsData: {
      newsId: string;
      title: string;
      excerpt: string;
      content: string;
      authorName: string;
      publishedAt: string;
      newsUrl: string;
      coverImageUrl?: string;
      category?: string;
      storeName: string;
      unsubscribeUrl: string;
    },
    options?: QueueOptions
  ): Promise<string> {
    return this.scheduleJob(
      EmailJobType.NEWS_PUBLISHED,
      {
        type: EmailJobType.NEWS_PUBLISHED,
        emailData: {
          to: [{ email: userEmail, name: userName }],
          subject: '',
          html: '',
          templateId: 'news_published',
          templateData: {
            userName,
            newsTitle: newsData.title,
            newsExcerpt: newsData.excerpt,
            newsContent: newsData.content,
            authorName: newsData.authorName,
            publishedAt: newsData.publishedAt,
            newsUrl: newsData.newsUrl,
            coverImageUrl: newsData.coverImageUrl,
            hasCoverImage: !!newsData.coverImageUrl,
            category: newsData.category,
            hasCategory: !!newsData.category,
            storeName: newsData.storeName,
            unsubscribeUrl: newsData.unsubscribeUrl,
          },
          priority: EmailPriority.NORMAL,
          tags: ['news', 'announcement'],
        },
      },
      { priority: EmailPriority.NORMAL, ...options }
    );
  }

  // ===============================
  // Utility Methods
  // ===============================

  private convertToBullOptions(options?: QueueOptions): JobOptions {
    if (!options) return {};

    return {
      priority: options.priority || EmailPriority.NORMAL,
      delay: options.delay,
      attempts: options.maxAttempts,
      backoff:
        options.backoff === 'exponential'
          ? {
              type: 'exponential',
              delay: options.backoffDelay || 5000,
            }
          : options.backoffDelay || 5000,
      removeOnComplete:
        options.removeOnComplete !== undefined ? options.removeOnComplete : 100,
      removeOnFail:
        options.removeOnFail !== undefined ? options.removeOnFail : 50,
      jobId: options.jobId,
    };
  }
}
