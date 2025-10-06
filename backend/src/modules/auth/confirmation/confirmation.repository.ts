import { Injectable } from '@nestjs/common';
import { DataSource, LessThan } from 'typeorm';
import { BaseRepository } from 'src/common/abstracts/base.repository';
import { Confirmation } from 'src/entities/user/authentication/confirmation.entity';
import { ConfirmationType } from 'src/modules/auth/confirmation/enums/confirmation.enum';

@Injectable()
export class ConfirmationRepository extends BaseRepository<Confirmation> {
  constructor(dataSource: DataSource) {
    super(Confirmation, dataSource.createEntityManager());
  }

  async findByToken(hashedToken: string): Promise<Confirmation | null> {
    return this.findOne({
      where: { token: hashedToken },
      relations: ['user'],
    });
  }

  async findPendingByUserAndType(
    userId: string,
    type: ConfirmationType
  ): Promise<Confirmation | null> {
    return this.findOne({
      where: {
        userId,
        type,
        isUsed: false,
      },
      order: { createdAt: 'DESC' },
    });
  }

  async findPendingByUser(userId: string): Promise<Confirmation[]> {
    return this.find({
      where: {
        userId,
        isUsed: false,
      },
      order: { createdAt: 'DESC' },
    });
  }

  async markAsUsed(confirmationId: string): Promise<void> {
    await this.update(confirmationId, {
      isUsed: true,
      usedAt: new Date(),
    });
  }

  async invalidateByUserAndType(
    userId: string,
    type: ConfirmationType
  ): Promise<void> {
    await this.update(
      { userId, type, isUsed: false },
      { isUsed: true, usedAt: new Date() }
    );
  }

  async cleanupExpiredTokens(): Promise<number> {
    // Method 1: Using LessThan operator (recommended)
    const result = await this.delete({
      expiresAt: LessThan(new Date()),
    });

    return result.affected || 0;
  }

  // Alternative method using query builder
  async cleanupExpiredTokensAlternative(): Promise<number> {
    const result = await this.createQueryBuilder()
      .delete()
      .from(Confirmation)
      .where('expiresAt < :now', { now: new Date() })
      .execute();

    return result.affected || 0;
  }

  // Method to cleanup expired tokens of specific type
  async cleanupExpiredTokensByType(type: ConfirmationType): Promise<number> {
    const result = await this.delete({
      type,
      expiresAt: LessThan(new Date()),
    });

    return result.affected || 0;
  }

  // Method to cleanup used tokens older than specified days
  async cleanupOldUsedTokens(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.delete({
      isUsed: true,
      usedAt: LessThan(cutoffDate),
    });

    return result.affected || 0;
  }

  // Get expired tokens count without deleting
  async getExpiredTokensCount(): Promise<number> {
    return this.count({
      where: {
        expiresAt: LessThan(new Date()),
      },
    });
  }

  // Get tokens expiring soon (for notification purposes)
  async getTokensExpiringSoon(
    hoursFromNow: number = 24
  ): Promise<Confirmation[]> {
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + hoursFromNow);

    return this.find({
      where: {
        expiresAt: LessThan(futureDate),
        isUsed: false,
      },
      relations: ['user'],
      order: { expiresAt: 'ASC' },
    });
  }

  // Comprehensive cleanup method
  async performMaintenance(): Promise<{
    expiredTokensDeleted: number;
    oldUsedTokensDeleted: number;
    totalCleaned: number;
  }> {
    const expiredTokensDeleted = await this.cleanupExpiredTokens();
    const oldUsedTokensDeleted = await this.cleanupOldUsedTokens(30);

    return {
      expiredTokensDeleted,
      oldUsedTokensDeleted,
      totalCleaned: expiredTokensDeleted + oldUsedTokensDeleted,
    };
  }

  async findByEmail(email: string): Promise<Confirmation[]> {
    return this.find({
      where: { email },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  // Get statistics about confirmations
  async getConfirmationStats(): Promise<{
    total: number;
    byType: Record<ConfirmationType, number>;
    pending: number;
    used: number;
    expired: number;
  }> {
    const total = await this.count();
    const pending = await this.count({ where: { isUsed: false } });
    const used = await this.count({ where: { isUsed: true } });
    const expired = await this.count({
      where: {
        expiresAt: LessThan(new Date()),
        isUsed: false,
      },
    });

    // Get counts by type
    const byType = {} as Record<ConfirmationType, number>;
    for (const type of Object.values(ConfirmationType)) {
      byType[type] = await this.count({ where: { type } });
    }

    return {
      total,
      byType,
      pending,
      used,
      expired,
    };
  }
}
