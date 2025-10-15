import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto } from '../user/dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenService } from 'src/modules/auth/refresh-token/refresh-token.service';
import { ConfirmationService } from './confirmation/confirmation.service';
import { AdminService } from 'src/modules/admin/admin.service';
import { StoreRoleService } from 'src/modules/store/store-role/store-role.service';
import { Request } from 'express';
import { StoreRoles } from 'src/common/enums/store-roles.enum';
import { AdminRoles } from 'src/common/enums/admin.enum';
import { ConfirmationType } from './confirmation/enums/confirmation.enum';
import { createHash, randomBytes } from 'crypto';
import { EmailQueueService } from 'src/modules/infrastructure/queues/email-queue/email-queue.service';
import {
  ConfirmationResult,
  ConfirmationStatus,
  JwtPayload,
} from 'src/modules/auth/types';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private configService: ConfigService,
    private userService: UserService,
    private jwtService: JwtService,
    private refreshTokenService: RefreshTokenService,
    private confirmationService: ConfirmationService,
    private emailQueueService: EmailQueueService,
    private adminService: AdminService,
    private storeRoleService: StoreRoleService
  ) {}

  private async validateUser(
    email: string,
    password: string,
    user: any
  ): Promise<boolean> {
    if (!user) return false;
    const passwordCheck = await bcrypt.compare(password, user.passwordHash);
    return user.email === email && passwordCheck;
  }

  async doesUserExists(checkDto: CreateUserDto | LoginDto): Promise<boolean> {
    try {
      await this.userService.findByEmail(checkDto.email);
      return true;
    } catch (err) {
      if (err instanceof NotFoundException) return false;
      throw err;
    }
  }

  async login(dto: LoginDto, req?: Request) {
    const user = await this.userService.findUserWithPassword(dto.email);
    if (!user)
      throw new NotFoundException(`User with such email doesn't exist`);

    if (!(await this.validateUser(dto.email, dto.password, user))) {
      throw new UnauthorizedException('Invalid password or email');
    }

    const payload: JwtPayload = {
      id: user.id,
      email: user.email,
      sub: user.id,
      isVerified: user.isEmailVerified || false,
    };

    const tokens = await this.getTokens(payload, req);

    let pendingConfirmations: {
      accountVerification: boolean;
      roleAssignments: Array<{
        type: ConfirmationType;
        metadata?: Record<string, any>;
        expiresAt: Date;
      }>;
    } | null = null;
    if (!user.isEmailVerified) {
      pendingConfirmations =
        await this.confirmationService.getPendingConfirmations(user.id);
    }

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        siteRole: user.siteRole,
        isEmailVerified: user.isEmailVerified || false,
      },
      pendingConfirmations,
    };
  }

  async register(createUserDto: CreateUserDto, req?: Request) {
    const check = await this.doesUserExists(createUserDto);
    if (check) throw new ConflictException('Such user already exists');

    const user = await this.userService.create({
      ...createUserDto,
    });

    await this.confirmationService.sendAccountConfirmation(user.id, user.email);

    await this.emailQueueService.sendWelcomeEmail(
      user.email,
      user.firstName || 'User',
      process.env.FRONTEND_URL || 'http://localhost:3000',
      process.env.SITE_NAME || 'Our Platform',
      { delay: 5 * 60 * 1000 }
    );

    // Build payload for tokens (same shape as login payload)
    const payload: JwtPayload = {
      id: user.id,
      email: user.email,
      sub: user.id,
      isVerified: false,
    };

    const tokens = await this.getTokens(payload, req);

    return {
      ...tokens, // { accessToken, refreshToken, csrfToken }
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isEmailVerified: user || false,
      },
      message:
        'Registration successful! Please check your email to verify your account.',
      requiresVerification: true,
    };
  }

  /**
   * Get comprehensive confirmation status for a user
   */
  async getConfirmationStatus(userId: string): Promise<ConfirmationStatus> {
    const user = await this.userService.getEntityById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get pending confirmations
    const pendingConfirmations =
      await this.confirmationService.getPendingConfirmations(userId);

    // Add time remaining for each role assignment
    const roleAssignmentsWithTime = pendingConfirmations.roleAssignments.map(
      (assignment) => ({
        ...assignment,
        timeRemaining: this.getTimeRemaining(assignment.expiresAt),
      })
    );

    // Get active roles
    const activeRoles = await this.getActiveRoles(userId);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isEmailVerified: user.isEmailVerified || false,
        emailVerifiedAt: user.emailVerifiedAt,
      },
      pendingConfirmations: {
        accountVerification: pendingConfirmations.accountVerification,
        roleAssignments: roleAssignmentsWithTime,
      },
      activeRoles,
    };
  }

  /**
   * Get active roles for a user
   */
  private async getActiveRoles(userId: string): Promise<{
    siteAdmin: boolean;
    storeRoles: Array<{
      storeId: string;
      storeName?: string;
      role: string;
      assignedAt: Date;
    }>;
  }> {
    // Check if user is site admin
    const siteAdmin = await this.adminService.isUserValidAdmin(userId);

    // Get store roles
    const storeRoles = await this.storeRoleService.getUserStoreRoles(userId);
    const formattedStoreRoles = storeRoles.map((role) => ({
      storeId: role.store.id,
      storeName: role.store.name,
      role: role.roleName,
      assignedAt: role.assignedAt || role.createdAt,
    }));

    return {
      siteAdmin,
      storeRoles: formattedStoreRoles,
    };
  }

  /**
   * Calculate time remaining until expiration
   */
  private getTimeRemaining(expiresAt: Date): string {
    const now = new Date();
    const timeLeft = expiresAt.getTime() - now.getTime();

    if (timeLeft <= 0) {
      return 'Expired';
    }

    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''}, ${hours} hour${hours > 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}, ${minutes} minute${minutes > 1 ? 's' : ''}`;
    } else {
      return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
  }

  /**
   * Verify email confirmation token
   */
  async confirmEmail(token: string): Promise<{
    success: boolean;
    message: string;
    user?: any;
  }> {
    const result = await this.confirmationService.confirmToken(token);

    if (result.success) {
      const user = await this.userService.getEntityById(result.userId);
      return {
        success: true,
        message: result.message,
        user: user
          ? {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              isEmailVerified: user.isEmailVerified,
            }
          : undefined,
      };
    }

    return {
      success: false,
      message: 'Email confirmation failed',
    };
  }

  /**
   * Confirm role assignment token
   */
  async confirmRole(token: string): Promise<{
    success: boolean;
    message: string;
    roleType: ConfirmationType;
    user?: any;
  }> {
    const result = await this.confirmationService.confirmToken(token);

    if (result.success) {
      const user = await this.userService.getEntityById(result.userId);

      // Get updated role information
      const activeRoles = await this.getActiveRoles(result.userId);

      return {
        success: true,
        message: result.message,
        roleType: result.type,
        user: user
          ? {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              isEmailVerified: user.isEmailVerified,
              activeRoles,
            }
          : undefined,
      };
    }

    return {
      success: false,
      message: 'Role confirmation failed',
      roleType: result.type,
    };
  }

  /**
   * Resend confirmation email
   */
  async resendConfirmation(userId: string): Promise<void> {
    const user = await this.userService.getEntityById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isEmailVerified) {
      throw new ConflictException('Email is already verified');
    }

    await this.confirmationService.sendAccountConfirmation(user.id, user.email);
  }

  /**
   * Cancel pending role assignment
   */
  async cancelRoleAssignment(
    userId: string,
    confirmationType: ConfirmationType,
    requestingUserId: string
  ): Promise<void> {
    // Verify the requesting user has permission to cancel the assignment
    const isAdmin = await this.adminService.isUserValidAdmin(requestingUserId);

    if (!isAdmin && userId !== requestingUserId) {
      throw new BadRequestException(
        'You can only cancel your own role assignments'
      );
    }

    await this.confirmationService.cancelPendingConfirmation(
      userId,
      confirmationType
    );
  }

  /**
   * Assign site admin role with confirmation
   */
  async assignSiteAdminRole(
    targetUserId: string,
    assignedByUserId: string
  ): Promise<void> {
    const targetUser = await this.userService.getEntityById(targetUserId);
    if (!targetUser) {
      throw new NotFoundException('Target user not found');
    }

    // Check if user is already an admin
    const isAlreadyAdmin =
      await this.adminService.isUserValidAdmin(targetUserId);
    if (isAlreadyAdmin) {
      throw new ConflictException('User is already a site administrator');
    }

    await this.confirmationService.sendRoleConfirmation(
      targetUserId,
      targetUser.email,
      AdminRoles.ADMIN,
      {
        assignedBy: assignedByUserId,
        assignedAt: new Date().toISOString(),
      }
    );
  }

  /**
   * Assign store role with confirmation
   */
  async assignStoreRole(
    targetUserId: string,
    storeId: string,
    role: StoreRoles,
    assignedByUserId: string
  ): Promise<void> {
    const targetUser = await this.userService.getEntityById(targetUserId);
    if (!targetUser) {
      throw new NotFoundException('Target user not found');
    }

    // Check if user already has a role in this store
    const existingRole = await this.storeRoleService.findByStoreUser(
      targetUserId,
      storeId
    );
    if (existingRole && existingRole.isActive) {
      throw new ConflictException(
        `User already has ${existingRole.roleName} role in this store`
      );
    }

    await this.confirmationService.sendRoleConfirmation(
      targetUserId,
      targetUser.email,
      role,
      {
        storeId,
        role,
        assignedBy: assignedByUserId,
        assignedAt: new Date().toISOString(),
      }
    );
  }

  /**
   * Revoke site admin role
   */
  async revokeSiteAdminRole(
    targetUserId: string,
    revokedByUserId: string
  ): Promise<void> {
    await this.adminService.revokeSiteAdminRole(targetUserId, revokedByUserId);
  }

  /**
   * Revoke store role
   */
  async revokeStoreRole(
    targetUserId: string,
    storeId: string,
    revokedByUserId: string
  ): Promise<void> {
    await this.storeRoleService.revokeStoreRole(
      targetUserId,
      storeId,
      revokedByUserId
    );
  }

  async refreshAccessToken(payload: JwtPayload, token: string, req?: Request) {
    const tokenRecord = await this.refreshTokenService.findByToken(token);
    if (
      !tokenRecord ||
      tokenRecord.isBanned ||
      tokenRecord.user.id !== payload.id
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.refreshTokenService.removeByValue(token);
    return await this.getTokens(payload, req);
  }

  async banRefresh(token: string) {
    return this.refreshTokenService.toggleBan(token);
  }

  private async getTokens(
    payload: JwtPayload,
    req?: Request
  ): Promise<{ accessToken: string; refreshToken: string; csrfToken: string }> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '15m'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>(
          'JWT_REFRESH_EXPIRES_IN',
          '7d'
        ),
      }),
    ]);

    const csrfToken = cryptoRandomHex(16);

    const ip = req
      ? req.ip ||
        (req.headers['x-forwarded-for'] as string) ||
        req.connection?.remoteAddress
      : undefined;
    const userAgent = req ? (req.headers['user-agent'] as string) : undefined;
    const deviceId = req ? (req.headers['x-device-id'] as string) : undefined;

    await this.refreshTokenService.create({
      userId: payload.id,
      token: refreshToken,
      deviceId,
      ip,
      userAgent,
    });

    return { accessToken, refreshToken, csrfToken };
  }

  /**
   * Process confirmation based on type parameter and token
   */
  async processConfirmation(
    typeParam: string,
    token: string
  ): Promise<ConfirmationResult> {
    const confirmationType = this.parseConfirmationType(typeParam);

    if (!confirmationType) {
      throw new BadRequestException(`Invalid confirmation type: ${typeParam}`);
    }

    // Process the confirmation
    const result = await this.confirmationService.confirmToken(token);

    if (!result.success) {
      return {
        success: false,
        message: result.message || 'Confirmation failed',
        type: confirmationType,
      };
    }

    // Verify the confirmation type matches what was expected
    if (result.type !== confirmationType) {
      throw new BadRequestException(
        `Token type mismatch. Expected ${confirmationType}, got ${result.type}`
      );
    }

    const user = await this.userService.getEntityById(result.userId);
    let activeRoles: null & any = null;

    // For role confirmations, include updated role information
    if (this.isRoleConfirmationType(confirmationType)) {
      activeRoles = await this.getActiveRoles(result.userId);
    }

    return {
      success: true,
      message: result.message,
      type: result.type,
      user: user
        ? {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            isEmailVerified: user.isEmailVerified,
          }
        : undefined,
      activeRoles,
    };
  }

  /**
   * Revoke/cancel a confirmation
   */
  async revokeConfirmation(
    typeParam: string,
    token: string
  ): Promise<{
    success: boolean;
    message: string;
    type: ConfirmationType;
  }> {
    const confirmationType = this.parseConfirmationType(typeParam);

    if (!confirmationType) {
      throw new BadRequestException(`Invalid confirmation type: ${typeParam}`);
    }

    // First, find the confirmation to get the user ID
    const hashedToken = this.hashToken(token);
    const confirmation =
      await this.confirmationService.findConfirmationByToken(hashedToken);

    if (!confirmation) {
      throw new NotFoundException('Confirmation not found');
    }

    if (confirmation.isUsed) {
      throw new BadRequestException('Confirmation has already been processed');
    }

    // Cancel the confirmation
    await this.confirmationService.cancelPendingConfirmation(
      confirmation.userId,
      confirmationType
    );

    return {
      success: true,
      message: `${this.getConfirmationTypeDisplayName(confirmationType)} has been cancelled`,
      type: confirmationType,
    };
  }

  /**
   * Convert kebab-case type parameter to ConfirmationType enum
   */
  private parseConfirmationType(typeParam: string): ConfirmationType | null {
    const typeMap: Record<string, ConfirmationType> = {
      'account-verification': ConfirmationType.ACCOUNT_VERIFICATION,
      'site-admin-role': ConfirmationType.SITE_ADMIN_ROLE,
      'store-admin-role': ConfirmationType.STORE_ADMIN_ROLE,
      'store-moderator-role': ConfirmationType.STORE_MODERATOR_ROLE,
      'password-reset': ConfirmationType.PASSWORD_RESET,
    };

    return typeMap[typeParam.toLowerCase()] || null;
  }

  /**
   * Check if confirmation type is role-related
   */
  private isRoleConfirmationType(type: ConfirmationType): boolean {
    return [
      ConfirmationType.SITE_ADMIN_ROLE,
      ConfirmationType.STORE_ADMIN_ROLE,
      ConfirmationType.STORE_MODERATOR_ROLE,
    ].includes(type);
  }

  /**
   * Get human-readable confirmation type name
   */
  private getConfirmationTypeDisplayName(type: ConfirmationType): string {
    const displayNames: Record<ConfirmationType, string> = {
      [ConfirmationType.ACCOUNT_VERIFICATION]: 'Account verification',
      [ConfirmationType.SITE_ADMIN_ROLE]: 'Site administrator role assignment',
      [ConfirmationType.STORE_ADMIN_ROLE]:
        'Store administrator role assignment',
      [ConfirmationType.STORE_MODERATOR_ROLE]:
        'Store moderator role assignment',
      [ConfirmationType.PASSWORD_RESET]: 'Password reset',
    };

    return displayNames[type] || 'Confirmation';
  }

  /**
   * Hash token for lookup (should match ConfirmationService implementation)
   */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
function cryptoRandomHex(length = 16) {
  return randomBytes(length).toString('hex');
}
