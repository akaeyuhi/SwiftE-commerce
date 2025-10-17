import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Param,
} from '@nestjs/common';
import { EmailService } from './email.service';
import { JwtAuthGuard } from 'src/modules/authorization/guards/jwt-auth.guard';
import { AdminGuard } from 'src/modules/authorization/guards/admin.guard';
import { StoreRolesGuard } from 'src/modules/authorization/guards/store-roles.guard';
import { StoreRole } from 'src/common/decorators/store-role.decorator';
import { AdminRole } from 'src/common/decorators/admin-role.decorator';
import { StoreRoles } from 'src/common/enums/store-roles.enum';
import { AdminRoles } from 'src/common/enums/admin.enum';
import {
  SendEmailDto,
  SendUserConfirmationDto,
  SendWelcomeEmailDto,
  SendStockAlertDto,
  SendLowStockWarningDto,
} from './dto/email.dto';
import { EmailQueueService } from 'src/modules/infrastructure/queues/email-queue/email-queue.service';

@Controller('email')
@UseGuards(JwtAuthGuard, AdminGuard, StoreRolesGuard)
export class EmailController {
  constructor(
    private readonly emailQueueService: EmailQueueService,
    private readonly emailService: EmailService
  ) {}

  /**
   * POST /email/send
   * Send a custom email (admin only)
   */
  @Post('send')
  @AdminRole(AdminRoles.ADMIN)
  async sendEmail(@Body() dto: SendEmailDto) {
    const result = await this.emailService.sendEmail(dto);

    return {
      success: true,
      data: {
        messageId: result.messageId,
        provider: result.provider,
        sentAt: result.sentAt,
      },
    };
  }

  /**
   * POST /email/user-confirmation
   * Send user confirmation email
   */
  @Post('user-confirmation')
  @AdminRole(AdminRoles.ADMIN)
  async sendUserConfirmation(@Body() dto: SendUserConfirmationDto) {
    const jobId = await this.emailQueueService.sendUserConfirmation(
      dto.userEmail,
      dto.userName,
      dto.confirmationUrl,
      dto.storeName
    );

    return {
      success: true,
      data: {
        jobId,
        scheduledAt: new Date().toISOString(),
      },
    };
  }

  /**
   * POST /email/welcome
   * Send welcome email
   */
  @Post('welcome')
  @AdminRole(AdminRoles.ADMIN)
  async sendWelcomeEmail(@Body() dto: SendWelcomeEmailDto) {
    const jobId = await this.emailQueueService.sendWelcomeEmail(
      dto.userEmail,
      dto.userName,
      dto.storeUrl,
      dto.storeName
    );

    return {
      success: true,
      data: {
        jobId,
        scheduledAt: new Date().toISOString(),
      },
    };
  }

  /**
   * POST /email/stock-alert
   * Send stock alert to users
   */
  @Post(':storeId/stock-alert')
  @StoreRole(StoreRoles.ADMIN, StoreRoles.MODERATOR)
  async sendStockAlert(
    @Param('storeId') storeId: string,
    @Body() dto: SendStockAlertDto
  ) {
    const jobId = await this.emailQueueService.sendStockAlert(
      dto.userEmail,
      dto.userName,
      dto.productData
    );

    return {
      success: true,
      data: {
        jobId,
        scheduledAt: new Date().toISOString(),
      },
    };
  }

  /**
   * POST /email/low-stock-warning
   * Send low stock warning to store owners
   */
  @Post(':storeId/low-stock-warning')
  @StoreRole(StoreRoles.ADMIN)
  async sendLowStockWarning(
    @Param('storeId') storeId: string,
    @Body() dto: SendLowStockWarningDto
  ) {
    const jobId = await this.emailQueueService.sendLowStockWarning(
      dto.storeOwnerEmail,
      dto.storeOwnerName,
      dto.productData,
      dto.manageInventoryUrl
    );

    return {
      success: true,
      data: {
        jobId,
        scheduledAt: new Date().toISOString(),
      },
    };
  }

  /**
   * GET /email/health
   * Email service health check
   */
  @Get('health')
  @AdminRole(AdminRoles.ADMIN)
  async healthCheck() {
    try {
      const health = await this.emailService.healthCheck();
      const queueStats = await this.emailQueueService.getStats();

      return {
        success: true,
        data: {
          service: 'email',
          ...health,
          queue: queueStats,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        data: {
          service: 'email',
          healthy: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * GET /email/queue/stats
   * Get email queue statistics
   */
  @Get('queue/stats')
  @AdminRole(AdminRoles.ADMIN)
  async getQueueStats() {
    const stats = await this.emailQueueService.getStats();

    return {
      success: true,
      data: {
        queue: 'email',
        stats,
        retrievedAt: new Date().toISOString(),
      },
    };
  }
}
