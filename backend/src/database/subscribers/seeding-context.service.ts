import { Injectable } from '@nestjs/common';

/**
 * Service to track if we're currently in a seeding operation
 * This allows subscribers to skip execution during bulk seeding
 */
@Injectable()
export class SeedingContextService {
  private isSeeding = false;

  /**
   * Check if currently seeding
   */
  isSeedingInProgress(): boolean {
    return this.isSeeding;
  }

  /**
   * Mark seeding as started
   */
  startSeeding(): void {
    this.isSeeding = true;
    console.log('🔇 Subscribers will skip execution during seeding...');
  }

  /**
   * Mark seeding as completed
   */
  endSeeding(): void {
    this.isSeeding = false;
    console.log('🔊 Subscribers re-enabled for normal operations');
  }
}
