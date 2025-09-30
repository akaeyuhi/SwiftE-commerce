import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  ValidationPipe,
  BadRequestException,
} from '@nestjs/common';
import { EmailQueueService } from './queues/email-queue.service';
import { EmailService } from './email.service';
import { JwtAuthGuard } from 'src/modules/auth/policy/guards/jwt-auth.guard';
import { AdminGuard } from 'src/modules/auth/policy/guards/admin.guard';
import { StoreRolesGuard } from 'src/modules/auth/policy/guards/store-roles.guard';
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
  async sendEmail(@Body(ValidationPipe) dto: SendEmailDto) {
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
  @StoreRole(StoreRoles.ADMIN, StoreRoles.MODERATOR)
  async sendUserConfirmation(
    @Body(ValidationPipe) dto: SendUserConfirmationDto
  ) {
    try {
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
    } catch (error) {
      throw new BadRequestException(
        `Failed to schedule confirmation email: ${error.message}`
      );
    }
  }

  /**
   * POST /email/welcome
   * Send welcome email
   */
  @Post('welcome')
  @StoreRole(StoreRoles.ADMIN, StoreRoles.MODERATOR)
  async sendWelcomeEmail(@Body(ValidationPipe) dto: SendWelcomeEmailDto) {
    try {
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
    } catch (error) {
      throw new BadRequestException(
        `Failed to schedule welcome email: ${error.message}`
      );
    }
  }

  /**
   * POST /email/stock-alert
   * Send stock alert to users
   */
  @Post('stock-alert')
  @StoreRole(StoreRoles.ADMIN, StoreRoles.MODERATOR)
  async sendStockAlert(@Body(ValidationPipe) dto: SendStockAlertDto) {
    try {
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
    } catch (error) {
      throw new BadRequestException(
        `Failed to schedule stock alert: ${error.message}`
      );
    }
  }

  /**
   * POST /email/low-stock-warning
   * Send low stock warning to store owners
   */
  @Post('low-stock-warning')
  @StoreRole(StoreRoles.ADMIN)
  async sendLowStockWarning(@Body(ValidationPipe) dto: SendLowStockWarningDto) {
    try {
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
    } catch (error) {
      throw new BadRequestException(
        `Failed to schedule low stock warning: ${error.message}`
      );
    }
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
    try {
      const stats = await this.emailQueueService.getStats();

      return {
        success: true,
        data: {
          queue: 'email',
          stats,
          retrievedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to get queue stats: ${error.message}`
      );
    }
  }
}
