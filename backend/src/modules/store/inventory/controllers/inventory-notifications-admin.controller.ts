import {
  Controller,
  Get,
  Delete,
  Post,
  Param,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/authorization/guards/jwt-auth.guard';
import { AdminGuard } from 'src/modules/authorization/guards/admin.guard';
import { InventoryNotificationsListener } from '../listeners/inventory-notifications.listener';

/**
 * Admin controller for managing inventory notification cooldowns.
 *
 * Provides endpoints for:
 * - Viewing active cooldowns
 * - Clearing cooldowns (for testing/override)
 * - Manual notification triggers
 * - Cooldown statistics
 */
@ApiTags('Inventory Notifications Admin')
@ApiBearerAuth()
@Controller('admin/inventory-notifications')
@UseGuards(JwtAuthGuard, AdminGuard)
export class InventoryNotificationsAdminController {
  constructor(
    private readonly notificationsListener: InventoryNotificationsListener
  ) {}

  /**
   * Get all active cooldowns.
   */
  @Get('cooldowns')
  @ApiOperation({
    summary: 'Get active notification cooldowns',
    description: 'Returns list of variants currently in cooldown period',
  })
  @ApiResponse({
    status: 200,
    description: 'List of active cooldowns',
    schema: {
      example: [
        {
          variantId: 'abc-123',
          type: 'low-stock',
          expiresIn: 1800000,
          expiresInMinutes: 30,
        },
      ],
    },
  })
  getActiveCooldowns() {
    return this.notificationsListener.getActiveCooldowns();
  }

  /**
   * Get cooldown statistics.
   */
  @Get('cooldowns/stats')
  @ApiOperation({
    summary: 'Get cooldown statistics',
    description: 'Returns overview of notification throttling state',
  })
  @ApiResponse({
    status: 200,
    description: 'Cooldown statistics',
    schema: {
      example: {
        totalActive: 15,
        byType: {
          'low-stock': 12,
          'out-of-stock': 3,
        },
        oldestCooldown: 1609459200000,
        newestCooldown: 1609462800000,
      },
    },
  })
  getCooldownStats() {
    return this.notificationsListener.getCooldownStats();
  }

  /**
   * Clear cooldown for specific variant.
   */
  @Delete('cooldowns/:variantId/:type')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Clear cooldown for variant',
    description: 'Removes cooldown to allow immediate re-notification',
  })
  @ApiParam({ name: 'variantId', description: 'Variant UUID' })
  @ApiParam({
    name: 'type',
    enum: ['low-stock', 'out-of-stock'],
    description: 'Cooldown type',
  })
  @ApiResponse({ status: 204, description: 'Cooldown cleared' })
  clearCooldown(
    @Param('variantId', new ParseUUIDPipe()) variantId: string,
    @Param('type') type: 'low-stock' | 'out-of-stock'
  ) {
    this.notificationsListener.clearCooldown(variantId, type);
  }

  /**
   * Clear all cooldowns for variant.
   */
  @Delete('cooldowns/:variantId')
  @ApiOperation({
    summary: 'Clear all cooldowns for variant',
    description: 'Removes all notification cooldowns for the variant',
  })
  @ApiParam({ name: 'variantId', description: 'Variant UUID' })
  @ApiResponse({
    status: 200,
    description: 'Number of cooldowns cleared',
    schema: { example: { cleared: 2 } },
  })
  clearAllVariantCooldowns(
    @Param('variantId', new ParseUUIDPipe()) variantId: string
  ) {
    const cleared =
      this.notificationsListener.clearAllVariantCooldowns(variantId);
    return { cleared };
  }

  /**
   * Manually trigger notification.
   */
  @Post('notify/:variantId/:type')
  @ApiOperation({
    summary: 'Manually trigger notification',
    description:
      'Force-send notification for variant, bypassing cooldown. Use with caution.',
  })
  @ApiParam({ name: 'variantId', description: 'Variant UUID' })
  @ApiParam({
    name: 'type',
    enum: ['low-stock', 'out-of-stock'],
    description: 'Notification type',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification triggered',
    schema: {
      example: {
        success: true,
        recipientCount: 3,
      },
    },
  })
  async manualNotify(
    @Param('variantId', new ParseUUIDPipe()) variantId: string,
    @Param('type') type: 'low-stock' | 'out-of-stock'
  ) {
    return this.notificationsListener.manualNotify(variantId, type);
  }

  /**
   * Cleanup expired cooldowns.
   */
  @Post('cooldowns/cleanup')
  @ApiOperation({
    summary: 'Cleanup expired cooldowns',
    description: 'Removes expired entries from cooldown cache',
  })
  @ApiResponse({
    status: 200,
    description: 'Number of entries cleaned',
    schema: { example: { cleaned: 5 } },
  })
  cleanupExpiredCooldowns() {
    const cleaned = this.notificationsListener.cleanupExpiredCooldowns();
    return { cleaned };
  }
}
