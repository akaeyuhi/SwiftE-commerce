import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfirmationService } from './confirmation.service';

@Injectable()
export class ConfirmationCleanupService {
  private readonly logger = new Logger(ConfirmationCleanupService.name);

  constructor(private readonly confirmationService: ConfirmationService) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleDailyCleanup() {
    this.logger.log('Starting scheduled confirmation cleanup...');

    try {
      const result = await this.confirmationService.performScheduledCleanup();

      if (result.success) {
        this.logger.log(
          `Cleanup completed: ${result.stats.totalCleaned} tokens cleaned`
        );
      } else {
        this.logger.error('Cleanup failed');
      }
    } catch (error) {
      this.logger.error('Scheduled cleanup error:', error);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async collectStats() {
    try {
      const stats = await this.confirmationService.getConfirmationStats();
      this.logger.debug(`Confirmation stats: ${JSON.stringify(stats)}`);

      if (stats.expired > 1000) {
        this.logger.warn(`High number of expired tokens: ${stats.expired}`);
      }
    } catch (error) {
      this.logger.error('Stats collection error:', error);
    }
  }
}
