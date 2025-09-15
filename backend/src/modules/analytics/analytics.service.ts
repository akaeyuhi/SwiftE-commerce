import { Injectable, Logger } from '@nestjs/common';
import { AnalyticsEventRepository } from './repositories/analytics-event.repository';
import { StoreDailyStatsRepository } from './repositories/store-daily-stats.repository';
import { ProductDailyStatsRepository } from './repositories/product-daily-stats.repository';
import { DataSource } from 'typeorm';
import { RecordEventDto } from './dto/record-event.dto';
import { AnalyticsEventType } from './entities/analytics-event.entity';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly eventsRepo: AnalyticsEventRepository,
    private readonly storeStatsRepo: StoreDailyStatsRepository,
    private readonly productStatsRepo: ProductDailyStatsRepository,
    private readonly dataSource: DataSource
  ) {}

  /**
   * Record a raw analytics event. This is intended to be very cheap.
   * We accept anonymous events (no req.user) to track views.
   */
  async recordEvent(dto: RecordEventDto) {
    const e = this.eventsRepo.create({
      storeId: dto.storeId,
      productId: dto.productId,
      userId: dto.userId,
      eventType: dto.eventType,
      value: dto.value ?? null,
      meta: dto.meta ?? null,
    } as any);
    return this.eventsRepo.save(e);
  }

  /**
   * Aggregate one day (UTC date string e.g. '2025-09-15') from raw events.
   * If date not supplied, aggregates yesterday.
   *
   * The implementation uses a transaction: reads raw events for the day,
   * computes per-store and per-product counts, upserts into daily stats tables.
   */
  async aggregateDay(date?: string) {
    const day = date ? new Date(date) : new Date();
    // Aggregate for previous day by default (end of day)
    const target = new Date(
      Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate())
    );
    // by default aggregate yesterday
    target.setUTCDate(target.getUTCDate() - 1);
    const dayStr = target.toISOString().slice(0, 10); // 'YYYY-MM-DD'

    this.logger.log(`Starting aggregation for date ${dayStr}`);

    await this.dataSource.transaction(async (manager) => {
      const events = await manager
        .getRepository(this.eventsRepo.metadata.target as any)
        .createQueryBuilder('e')
        .select([
          'e.storeId as storeId',
          'e.productId as productId',
          'e.eventType as eventType',
          'count(*) as cnt',
          'sum(coalesce(e.value,0)) as value_sum',
        ])
        .where('e.createdAt >= :start AND e.createdAt < :end', {
          start: `${dayStr}T00:00:00.000Z`,
          end: `${dayStr}T23:59:59.999Z`,
        })
        .groupBy('e.storeId, e.productId, e.eventType')
        .getRawMany();

      // build up maps
      const storeMap = new Map<
        string,
        Partial<Record<string, number | number[]>>
      >();
      const productMap = new Map<
        string,
        Partial<Record<string, number | number[]>>
      >();

      for (const row of events as any[]) {
        const storeId = row.storeId as string;
        const productId = row.productId as string;
        const eventType = row.eventType as string;
        const cnt = Number(row.cnt || 0);
        const valueSum = Number(row.value_sum || 0);

        // aggregate into store
        if (storeId) {
          const entry = storeMap.get(storeId) || {};
          // increment counters
          switch (eventType) {
            case AnalyticsEventType.VIEW:
              entry.views = ((entry.views || 0) as number) + cnt;
              break;
            case AnalyticsEventType.LIKE:
              entry.likes = ((entry.likes || 0) as number) + cnt;
              break;
            case AnalyticsEventType.ADD_TO_CART:
              entry.addToCarts = ((entry.addToCarts || 0) as number) + cnt;
              break;
            case AnalyticsEventType.PURCHASE:
              entry.purchases = ((entry.purchases || 0) as number) + cnt;
              entry.revenue = ((entry.revenue || 0) as number) + valueSum;
              break;
            case AnalyticsEventType.CHECKOUT:
              entry.checkouts = ((entry.checkouts || 0) as number) + cnt;
              break;
            default:
              // ignore custom for now
              break;
          }
          storeMap.set(storeId, entry);
        }

        // aggregate into product
        if (productId) {
          const pentry = productMap.get(productId) || {};
          switch (eventType) {
            case AnalyticsEventType.VIEW:
              pentry.views = ((pentry.views || 0) as number) + cnt;
              break;
            case AnalyticsEventType.LIKE:
              pentry.likes = ((pentry.likes || 0) as number) + cnt;
              break;
            case AnalyticsEventType.ADD_TO_CART:
              pentry.addToCarts = ((pentry.addToCarts || 0) as number) + cnt;
              break;
            case AnalyticsEventType.PURCHASE:
              pentry.purchases = ((pentry.purchases || 0) as number) + cnt;
              pentry.revenue = ((pentry.revenue || 0) as number) + valueSum;
              break;
            default:
              break;
          }
          productMap.set(productId, pentry);
        }
      }

      // Upsert into store_daily_stats
      const storeRepoTx = manager.getRepository(
        this.storeStatsRepo.metadata.target as any
      );
      for (const [storeId, data] of storeMap.entries()) {
        // try find existing row
        let row = await storeRepoTx.findOne({
          where: { storeId, date: dayStr } as any,
        });
        if (!row) {
          row = storeRepoTx.create({
            storeId,
            date: dayStr,
            views: data.views || 0,
            likes: data.likes || 0,
            addToCarts: data.addToCarts || 0,
            purchases: data.purchases || 0,
            checkouts: data.checkouts || 0,
            revenue: data.revenue || 0,
          } as any);
          await storeRepoTx.save(row);
        } else {
          // increment existing counters
          row.views = (Number(row.views) || 0) + (Number(data.views) || 0);
          row.likes = (Number(row.likes) || 0) + (Number(data.likes) || 0);
          row.addToCarts =
            (Number(row.addToCarts) || 0) + (Number(data.addToCarts) || 0);
          row.purchases =
            (Number(row.purchases) || 0) + (Number(data.purchases) || 0);
          row.checkouts =
            (Number(row.checkouts) || 0) + (Number(data.checkouts) || 0);
          row.revenue =
            (Number(row.revenue) || 0) + (Number(data.revenue) || 0);
          await storeRepoTx.save(row);
        }
      }

      // Upsert into product_daily_stats
      const productRepoTx = manager.getRepository(
        this.productStatsRepo.metadata.target as any
      );
      for (const [productId, data] of productMap.entries()) {
        let prow = await productRepoTx.findOne({
          where: { productId, date: dayStr } as any,
        });
        if (!prow) {
          prow = productRepoTx.create({
            productId,
            date: dayStr,
            views: data.views || 0,
            likes: data.likes || 0,
            addToCarts: data.addToCarts || 0,
            purchases: data.purchases || 0,
            revenue: data.revenue || 0,
          } as any);
          await productRepoTx.save(prow);
        } else {
          prow.views = (Number(prow.views) || 0) + (Number(data.views) || 0);
          prow.likes = (Number(prow.likes) || 0) + (Number(data.likes) || 0);
          prow.addToCarts =
            (Number(prow.addToCarts) || 0) + (Number(data.addToCarts) || 0);
          prow.purchases =
            (Number(prow.purchases) || 0) + (Number(data.purchases) || 0);
          prow.revenue =
            (Number(prow.revenue) || 0) + (Number(data.revenue) || 0);
          await productRepoTx.save(prow);
        }
      }
    });

    this.logger.log(`Aggregation for ${dayStr} completed`);
    return { date: dayStr };
  }

  /**
   * Get store aggregated stats for a range (reads from store_daily_stats).
   */
  async getStoreStats(storeId: string, from?: string, to?: string) {
    const qb = this.storeStatsRepo
      .createQueryBuilder('s')
      .where('s.storeId = :storeId', { storeId });

    if (from) qb.andWhere('s.date >= :from', { from });
    if (to) qb.andWhere('s.date <= :to', { to });

    qb.orderBy('s.date', 'ASC');
    return qb.getMany();
  }

  /**
   * Get product aggregated stats for a range (reads from product_daily_stats).
   */
  async getProductStats(productId: string, from?: string, to?: string) {
    const qb = this.productStatsRepo
      .createQueryBuilder('p')
      .where('p.productId = :productId', { productId });

    if (from) qb.andWhere('p.date >= :from', { from });
    if (to) qb.andWhere('p.date <= :to', { to });

    qb.orderBy('p.date', 'ASC');
    return qb.getMany();
  }

  /**
   * Example scheduled aggregation — run daily at 01:05 UTC to aggregate yesterday.
   * Requires @nestjs/schedule module registered (ScheduleModule.forRoot()).
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM) // every day at 01:00 UTC; change if needed
  async scheduledAggregation() {
    try {
      await this.aggregateDay();
    } catch (err) {
      this.logger.error('Scheduled aggregation failed: ' + err?.message);
    }
  }
}
