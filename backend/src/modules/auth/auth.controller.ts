import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  Req,
  Res,
  UseGuards,
  HttpCode,
  ValidationPipe,
  BadRequestException,
  Delete,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { RefreshDto } from './dto/refresh.dto';
import { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from 'src/modules/authorization/guards/jwt-auth.guard';
import {
  AssignRoleDto,
  CancelRoleAssignmentDto,
  ResendConfirmationDto,
  ConfirmTokenDto,
} from 'src/modules/auth/confirmation/dto/confirmation.dto';
import { AdminGuard } from 'src/modules/authorization/guards/admin.guard';
import { StoreRoles } from 'src/common/enums/store-roles.enum';

const REFRESH_COOKIE_NAME =
  process.env.REFRESH_TOKEN_COOKIE_NAME || 'refreshToken';
const CSRF_COOKIE_NAME = process.env.CSRF_COOKIE_NAME || 'XSRF-TOKEN';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body(ValidationPipe) dto: CreateUserDto,
    @Req() req: Request,
    @Res() res: Response
  ) {
    const result = await this.authService.register(dto, req);
    const {
      accessToken,
      refreshToken,
      csrfToken,
      user,
      message,
      requiresVerification,
    } = result;

    setRefreshCookie(res, refreshToken);
    setCsrfCookie(res, csrfToken);

    return res.status(201).json({
      success: true,
      accessToken,
      user,
      message,
      requiresVerification,
    });
  }

  @Post('login')
  async login(
    @Body(ValidationPipe) dto: LoginDto,
    @Req() req: Request,
    @Res() res: Response
  ) {
    const result = await this.authService.login(dto, req);
    const { accessToken, refreshToken, csrfToken, user, pendingConfirmations } =
      result;

    setRefreshCookie(res, refreshToken);
    setCsrfCookie(res, csrfToken);

    return res.json({
      success: true,
      accessToken,
      user,
      pendingConfirmations,
    });
  }

  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res() res: Response) {
    const csrfHeader =
      req.headers['x-csrf-token'] || req.headers['x-xsrf-token'];
    const csrfCookie = req.cookies ? req.cookies[CSRF_COOKIE_NAME] : undefined;

    if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
      return res.status(403).json({
        success: false,
        message: 'Invalid CSRF token',
      });
    }

    const rawRefreshToken = extractRefreshTokenFromReq(req);
    const payload = {
      id: (req.user as any).id,
      email: (req.user as any).email,
      sub: (req.user as any).id,
      isVerified: (req.user as any).isVerified,
    };

    const { accessToken, refreshToken, csrfToken } =
      await this.authService.refreshAccessToken(payload, rawRefreshToken!, req);

    setRefreshCookie(res, refreshToken);
    setCsrfCookie(res, csrfToken);

    return res.json({
      success: true,
      accessToken,
    });
  }

  @Post('logout')
  async logout(
    @Req() req: Request,
    @Res() res: Response,
    @Body() dto: RefreshDto
  ) {
    const token = extractRefreshTokenFromReq(req) || dto?.refreshToken;
    if (token) {
      await this.authService.banRefresh(token);
    }

    clearAuthCookies(res);
    return res.json({
      success: true,
      message: 'Logged out successfully',
    });
  }

  // ====================================================================
  // UNIFIED CONFIRMATION ROUTES
  // ====================================================================

  /**
   * GET /auth/confirm/:type?token=xxx
   * Unified confirmation endpoint for email links
   * Handles: account-verification, site-admin-role, store-admin-role, store-moderator-role
   */
  @Get('confirm/:type')
  async confirmFromLink(
    @Param('type') typeParam: string,
    @Query('token') token: string
  ) {
    if (!token) {
      throw new BadRequestException('Confirmation token is required');
    }

    const result = await this.authService.processConfirmation(typeParam, token);

    return {
      success: result.success,
      message: result.message,
      type: result.type,
      user: result.user,
      activeRoles: result.activeRoles,
    };
  }

  /**
   * POST /auth/confirm/:type
   * Unified confirmation endpoint for API calls
   * Handles: account-verification, site-admin-role, store-admin-role, store-moderator-role
   */
  @Post('confirm/:type')
  async confirmFromApi(
    @Param('type') typeParam: string,
    @Body(ValidationPipe) dto: ConfirmTokenDto
  ) {
    const result = await this.authService.processConfirmation(
      typeParam,
      dto.token
    );

    return {
      success: result.success,
      message: result.message,
      type: result.type,
      user: result.user,
      activeRoles: result.activeRoles,
    };
  }

  /**
   * DELETE /auth/confirm/:type?token=xxx
   * Cancel/revoke a confirmation (for email links with revoke functionality)
   */
  @Delete('confirm/:type')
  async revokeConfirmationFromLink(
    @Param('type') typeParam: string,
    @Query('token') token: string
  ) {
    if (!token) {
      throw new BadRequestException('Confirmation token is required');
    }

    const result = await this.authService.revokeConfirmation(typeParam, token);

    return {
      success: result.success,
      message: result.message,
      type: result.type,
    };
  }

  // ====================================================================
  // OTHER CONFIRMATION MANAGEMENT ROUTES
  // ====================================================================

  /**
   * Resend confirmation email
   */
  @UseGuards(JwtAuthGuard)
  @Post('resend-confirmation')
  async resendConfirmation(
    @Body(ValidationPipe) dto: ResendConfirmationDto,
    @Req() req: Request
  ) {
    const userId = dto.userId || (req.user as any)?.id;

    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    await this.authService.resendConfirmation(userId);

    return {
      success: true,
      message: 'Confirmation email sent successfully',
    };
  }

  /**
   * Get user's confirmation status
   */
  @UseGuards(JwtAuthGuard)
  @Get(':userId/confirmation-status')
  async getConfirmationStatus(@Param('userId') userId: string) {
    const result = await this.authService.getConfirmationStatus(userId);

    return {
      success: true,
      data: result,
    };
  }

  // ====================================================================
  // ROLE ASSIGNMENT ROUTES
  // ====================================================================

  /**
   * Assign site admin role (requires admin privileges)
   */
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('assign-site-admin')
  async assignSiteAdmin(
    @Body(ValidationPipe) dto: AssignRoleDto,
    @Req() req: Request
  ) {
    const assignedBy = (req.user as any).id;

    await this.authService.assignSiteAdminRole(dto.userId, assignedBy);

    return {
      success: true,
      message: 'Site admin role assignment email sent',
    };
  }

  /**
   * Assign store role (admin/moderator)
   */
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('assign-store-role')
  async assignStoreRole(
    @Body(ValidationPipe) dto: AssignRoleDto,
    @Req() req: Request
  ) {
    const assignedBy = (req.user as any).id;

    if (!dto.storeId || !dto.role) {
      throw new BadRequestException('Store ID and role are required');
    }

    await this.authService.assignStoreRole(
      dto.userId,
      dto.storeId,
      dto.role as StoreRoles,
      assignedBy
    );

    return {
      success: true,
      message: `Store ${dto.role} role assignment email sent`,
    };
  }

  /**
   * Cancel pending role assignment
   */
  @UseGuards(JwtAuthGuard)
  @Delete('cancel-role-assignment')
  async cancelRoleAssignment(
    @Body(ValidationPipe) dto: CancelRoleAssignmentDto,
    @Req() req: Request
  ) {
    const requestingUserId = (req.user as any)?.id;

    if (!requestingUserId) {
      throw new BadRequestException('User ID is required');
    }

    await this.authService.cancelRoleAssignment(
      dto.userId || requestingUserId,
      dto.confirmationType,
      requestingUserId
    );

    return {
      success: true,
      message: 'Role assignment cancelled successfully',
    };
  }

  /**
   * Revoke site admin role
   */
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('revoke-site-admin')
  async revokeSiteAdmin(
    @Body(ValidationPipe) dto: AssignRoleDto,
    @Req() req: Request
  ) {
    const revokedBy = (req.user as any).id;

    await this.authService.revokeSiteAdminRole(dto.userId, revokedBy);

    return {
      success: true,
      message: 'Site admin role revoked successfully',
    };
  }

  /**
   * Revoke store role
   */
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('revoke-store-role')
  async revokeStoreRole(
    @Body(ValidationPipe) dto: AssignRoleDto,
    @Req() req: Request
  ) {
    const revokedBy = (req.user as any).id;

    if (!dto.storeId) {
      throw new BadRequestException('Store ID is required');
    }

    await this.authService.revokeStoreRole(dto.userId, dto.storeId, revokedBy);

    return {
      success: true,
      message: 'Store role revoked successfully',
    };
  }
}

// Helper functions remain the same...
function setRefreshCookie(res: Response, refreshToken: string) {
  const secure = (process.env.COOKIE_SECURE || 'true') === 'true';
  const maxAge = 7 * 24 * 60 * 60 * 1000;
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/auth/refresh',
    maxAge,
  });
}

function setCsrfCookie(res: Response, csrfToken: string) {
  const secure = (process.env.COOKIE_SECURE || 'true') === 'true';
  res.cookie(CSRF_COOKIE_NAME, csrfToken, {
    httpOnly: false,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearAuthCookies(res: Response) {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/auth/refresh' });
  res.clearCookie(CSRF_COOKIE_NAME, { path: '/' });
}

function extractRefreshTokenFromReq(req: Request): string | undefined {
  if (!req) return undefined;
  if (req.cookies && req.cookies[REFRESH_COOKIE_NAME])
    return req.cookies[REFRESH_COOKIE_NAME];
  if (req.body && (req.body as any).refreshToken)
    return (req.body as any).refreshToken;
  if (req.headers['x-refresh-token'])
    return req.headers['x-refresh-token'] as string;
  const auth = req.headers['authorization'] as string;
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
  return undefined;
}
