// src/modules/auth/confirmation/confirmation.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';
import { ConfirmationRepository } from './confirmation.repository';
import { EmailQueueService } from 'src/modules/email/queues/email-queue.service';
import { UserService } from 'src/modules/user/user.service';
import { AdminService } from '../admin/admin.service';
import { UserRoleService } from 'src/modules/user/user-role/user-role.service';
import { ConfirmationType } from './enums/confirmation.enum';
import { Confirmation } from './entities/confirmation.entity';
import { StoreRoles } from 'src/common/enums/store-roles.enum';
import { AdminRoles } from 'src/common/enums/admin.enum';

@Injectable()
export class ConfirmationService {
  private readonly logger = new Logger(ConfirmationService.name);

  constructor(
    private readonly confirmationRepo: ConfirmationRepository,
    private readonly emailQueueService: EmailQueueService,
    private readonly userService: UserService,
    private readonly adminService: AdminService,
    private readonly userRoleService: UserRoleService
  ) {}

  /**
   * Generate and send account confirmation email
   */
  async sendAccountConfirmation(userId: string, email: string): Promise<void> {
    const token = this.generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await this.confirmationRepo.createEntity({
      userId,
      email,
      token: this.hashToken(token),
      type: ConfirmationType.ACCOUNT_VERIFICATION,
      expiresAt,
      isUsed: false,
    });

    const confirmationUrl = this.buildConfirmationUrl(
      token,
      ConfirmationType.ACCOUNT_VERIFICATION
    );
    const user = await this.userService.getEntityById(userId);

    await this.emailQueueService.sendUserConfirmation(
      email,
      user?.firstName || 'User',
      confirmationUrl,
      process.env.SITE_NAME || 'Our Platform'
    );
  }

  /**
   * Send role assignment confirmation email
   */
  async sendRoleConfirmation(
    userId: string,
    email: string,
    role: AdminRoles | StoreRoles,
    metadata?: Record<string, any>
  ): Promise<void> {
    const token = this.generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const confirmationType = this.mapRoleToConfirmationType(role);

    await this.confirmationRepo.createEntity({
      userId,
      email,
      token: this.hashToken(token),
      type: confirmationType,
      expiresAt,
      isUsed: false,
      metadata,
    });

    const confirmationUrl = this.buildConfirmationUrl(token, confirmationType);
    const user = await this.userService.getEntityById(userId);

    await this.emailQueueService.sendRoleConfirmation(
      email,
      user?.firstName || 'User',
      role,
      confirmationUrl,
      metadata
    );
  }

  /**
   * Verify and process confirmation token
   */
  async confirmToken(token: string): Promise<{
    success: boolean;
    type: ConfirmationType;
    userId: string;
    message: string;
  }> {
    const hashedToken = this.hashToken(token);
    const confirmation = await this.confirmationRepo.findByToken(hashedToken);

    if (!confirmation) {
      throw new NotFoundException('Invalid or expired confirmation token');
    }

    if (confirmation.isUsed) {
      throw new BadRequestException('Confirmation token has already been used');
    }

    if (confirmation.expiresAt < new Date()) {
      throw new BadRequestException('Confirmation token has expired');
    }

    // Mark as used
    await this.confirmationRepo.markAsUsed(confirmation.id);

    // Process confirmation based on type
    await this.processConfirmation(confirmation);

    return {
      success: true,
      type: confirmation.type,
      userId: confirmation.userId,
      message: this.getConfirmationSuccessMessage(confirmation.type),
    };
  }

  /**
   * Resend confirmation email
   */
  async resendConfirmation(
    userId: string,
    type: ConfirmationType
  ): Promise<void> {
    const user = await this.userService.getEntityById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existingConfirmation =
      await this.confirmationRepo.findPendingByUserAndType(userId, type);

    if (existingConfirmation && existingConfirmation.expiresAt > new Date()) {
      throw new BadRequestException(
        'A confirmation email was already sent recently'
      );
    }

    await this.confirmationRepo.invalidateByUserAndType(userId, type);

    switch (type) {
      case ConfirmationType.ACCOUNT_VERIFICATION:
        await this.sendAccountConfirmation(userId, user.email);
        break;
      default:
        throw new BadRequestException('Invalid confirmation type for resend');
    }
  }

  /**
   * Check if user has pending confirmations
   */
  async getPendingConfirmations(userId: string): Promise<{
    accountVerification: boolean;
    roleAssignments: Array<{
      type: ConfirmationType;
      metadata?: Record<string, any>;
      expiresAt: Date;
    }>;
  }> {
    const confirmations = await this.confirmationRepo.findPendingByUser(userId);

    return {
      accountVerification: confirmations.some(
        (c) => c.type === ConfirmationType.ACCOUNT_VERIFICATION
      ),
      roleAssignments: confirmations
        .filter((c) => c.type !== ConfirmationType.ACCOUNT_VERIFICATION)
        .map((c) => ({
          type: c.type,
          metadata: c.metadata,
          expiresAt: c.expiresAt,
        })),
    };
  }

  /**
   * Cancel pending confirmation
   */
  async cancelPendingConfirmation(
    userId: string,
    type: ConfirmationType
  ): Promise<void> {
    const confirmation = await this.confirmationRepo.findPendingByUserAndType(
      userId,
      type
    );

    if (!confirmation) {
      throw new NotFoundException('No pending confirmation found');
    }

    if (confirmation.isUsed) {
      throw new BadRequestException('Confirmation has already been used');
    }

    // Mark as used to effectively cancel it
    await this.confirmationRepo.markAsUsed(confirmation.id);
  }

  // Private helper methods
  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private buildConfirmationUrl(token: string, type: ConfirmationType): string {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const typeParam = type.toLowerCase().replace(/_/g, '-');
    return `${baseUrl}/auth/confirm/${typeParam}?token=${token}`;
  }

  private mapRoleToConfirmationType(
    roleType: AdminRoles | StoreRoles
  ): ConfirmationType {
    switch (roleType) {
      case AdminRoles.ADMIN:
        return ConfirmationType.SITE_ADMIN_ROLE;
      case StoreRoles.ADMIN:
        return ConfirmationType.STORE_ADMIN_ROLE;
      case StoreRoles.MODERATOR:
        return ConfirmationType.STORE_MODERATOR_ROLE;
      default:
        throw new BadRequestException('Invalid role type');
    }
  }

  /**
   * Process confirmation with proper typing using existing services
   */
  private async processConfirmation(confirmation: Confirmation): Promise<void> {
    try {
      switch (confirmation.type) {
        case ConfirmationType.ACCOUNT_VERIFICATION:
          await this.userService.markAsVerified(confirmation.userId);
          break;

        case ConfirmationType.SITE_ADMIN_ROLE:
          const assignedBy = confirmation.metadata?.assignedBy;
          await this.adminService.assignSiteAdminRole(
            confirmation.userId,
            assignedBy
          );
          break;

        case ConfirmationType.STORE_ADMIN_ROLE:
          const adminStoreId = confirmation.metadata?.storeId;
          const adminAssignedBy = confirmation.metadata?.assignedBy;
          if (adminStoreId) {
            await this.userRoleService.assignStoreRole(
              confirmation.userId,
              adminStoreId,
              StoreRoles.ADMIN,
              adminAssignedBy
            );
          }
          break;

        case ConfirmationType.STORE_MODERATOR_ROLE:
          const moderatorStoreId = confirmation.metadata?.storeId;
          const moderatorAssignedBy = confirmation.metadata?.assignedBy;
          if (moderatorStoreId) {
            await this.userRoleService.assignStoreRole(
              confirmation.userId,
              moderatorStoreId,
              StoreRoles.MODERATOR,
              moderatorAssignedBy
            );
          }
          break;

        case ConfirmationType.PASSWORD_RESET:
          // Password reset logic would go here
          break;

        default:
          throw new BadRequestException(
            `Unknown confirmation type: ${confirmation.type}`
          );
      }
    } catch (error) {
      this.logger.error(
        `Failed to process confirmation ${confirmation.id}:`,
        error
      );

      await this.storeProcessingError(confirmation, error);
    }
  }

  /**
   * Store processing error in confirmation metadata
   */
  private async storeProcessingError(
    confirmation: Confirmation,
    error: any
  ): Promise<void> {
    try {
      const updatedMetadata = {
        ...confirmation.metadata,
        processingError: error?.message || String(error),
        processingErrorAt: new Date().toISOString(),
      };

      await this.confirmationRepo.updateEntity(confirmation.id, {
        metadata: updatedMetadata,
      });
    } catch (updateError) {
      this.logger.error(
        `Failed to store processing error for confirmation ${confirmation.id}:`,
        updateError
      );
    }
  }

  private getConfirmationSuccessMessage(type: ConfirmationType): string {
    switch (type) {
      case ConfirmationType.ACCOUNT_VERIFICATION:
        return 'Your account has been successfully verified';
      case ConfirmationType.SITE_ADMIN_ROLE:
        return 'Site administrator role has been assigned';
      case ConfirmationType.STORE_ADMIN_ROLE:
        return 'Store administrator role has been assigned';
      case ConfirmationType.STORE_MODERATOR_ROLE:
        return 'Store moderator role has been assigned';
      case ConfirmationType.PASSWORD_RESET:
        return 'Password reset confirmed';
      default:
        return 'Confirmation successful';
    }
  }

  /**
   * Get confirmation statistics for monitoring
   */
  async getConfirmationStats(): Promise<{
    total: number;
    byType: Record<ConfirmationType, number>;
    pending: number;
    used: number;
    expired: number;
  }> {
    return this.confirmationRepo.getConfirmationStats();
  }

  /**
   * Perform scheduled cleanup of expired tokens
   */
  async performScheduledCleanup(): Promise<{
    success: boolean;
    stats: {
      expiredTokensDeleted: number;
      oldUsedTokensDeleted: number;
      totalCleaned: number;
    };
  }> {
    try {
      const stats = await this.confirmationRepo.performMaintenance();

      this.logger.log(
        `Confirmation cleanup completed: ${stats.totalCleaned} tokens removed`
      );

      return {
        success: true,
        stats,
      };
    } catch (error) {
      this.logger.error('Confirmation cleanup failed:', error);
      return {
        success: false,
        stats: {
          expiredTokensDeleted: 0,
          oldUsedTokensDeleted: 0,
          totalCleaned: 0,
        },
      };
    }
  }
  /**
   * Find confirmation by token (for revocation purposes)
   */
  async findConfirmationByToken(
    hashedToken: string
  ): Promise<Confirmation | null> {
    return this.confirmationRepo.findByToken(hashedToken);
  }
}
