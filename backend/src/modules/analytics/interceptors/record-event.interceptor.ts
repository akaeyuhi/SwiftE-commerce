// src/modules/analytics/interceptors/record-event.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import {
  RECORD_EVENT_META,
  RECORD_EVENTS_MAP_META,
  RecordEventOptions,
} from 'src/common/decorators/record-event.decorator';
import { AnalyticsQueueService } from '../queues/analytics-queue.service';
import { AnalyticsEventType } from '../entities/analytics-event.entity';
import { RecordEventDto } from '../dto/record-event.dto';

@Injectable()
export class RecordEventInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RecordEventInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly queue: AnalyticsQueueService
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const handler = context.getHandler();
    const controller = context.getClass();

    let opts = this.reflector.get<RecordEventOptions>(
      RECORD_EVENT_META,
      handler
    );

    if (!opts) {
      const map = this.reflector.get<Record<string, RecordEventOptions>>(
        RECORD_EVENTS_MAP_META,
        controller
      );
      if (map && handler && handler.name) {
        opts = map[handler.name];
      }
    }

    if (!opts) return next.handle();

    const req = context.switchToHttp().getRequest();

    const resolve = (spec?: string | number | Record<string, any>) => {
      if (spec === undefined || spec === null) return undefined;
      if (typeof spec !== 'string') return spec;
      const parts = spec.split('.');
      const obj: any = {
        params: req.params,
        query: req.query,
        body: req.body,
        user: req.user,
        headers: req.headers,
        request: req,
      };
      const first = parts[0];
      if (Object.prototype.hasOwnProperty.call(obj, first)) {
        let cur = obj[first];
        for (let i = 1; i < parts.length; i++) {
          cur = cur === null ? undefined : cur[parts[i]];
        }
        return cur;
      }
      const fallback = (key: string) =>
        req.params?.[key] ??
        req.body?.[key] ??
        req.query?.[key] ??
        req.user?.[key];
      if (parts.length === 1) return fallback(parts[0]);
      return undefined;
    };

    const enqueue = async () => {
      try {
        // Resolve fields
        const resolvedStoreId =
          resolve(opts!.storeId) ?? resolve('params.storeId');
        const resolvedProductId =
          resolve(opts!.productId) ??
          resolve('params.productId') ??
          resolve('params.id') ??
          resolve('body.productId');
        const resolvedUserId =
          resolve(opts!.userId) ?? (req.user && (req.user.id ?? req.user.sub));
        const resolvedValue =
          typeof opts!.value === 'number' ? opts!.value : resolve(opts!.value);
        const resolvedMeta =
          typeof opts!.meta === 'string'
            ? resolve(opts!.meta)
            : (opts!.meta ?? resolve('body.meta'));

        // Determine invokedOn: explicit override wins, otherwise infer
        const invokedOn: 'store' | 'product' =
          opts!.invokedOn ??
          (resolvedProductId ? 'product' : resolvedStoreId ? 'store' : 'store');

        const dto: RecordEventDto = {
          storeId: (resolvedStoreId as string) ?? null,
          productId: (resolvedProductId as string) ?? null,
          userId: (resolvedUserId as string) ?? null,
          eventType: opts!.eventType as any,
          invokedOn,
          value: (resolvedValue as any) ?? null,
          meta: (resolvedMeta as any) ?? null,
        };

        // Use convenience methods when available
        switch (opts!.eventType) {
          case AnalyticsEventType.VIEW:
            await this.queue.recordView(
              dto.storeId ?? undefined,
              dto.productId ?? undefined,
              dto.userId ?? undefined,
              dto.meta ?? undefined
            );
            break;
          case AnalyticsEventType.LIKE:
            await this.queue.recordLike(
              dto.storeId ?? undefined,
              dto.productId ?? undefined,
              dto.userId ?? undefined,
              dto.meta ?? undefined
            );
            break;
          case AnalyticsEventType.ADD_TO_CART:
            await this.queue.recordAddToCart(
              dto.storeId ?? '',
              dto.productId ?? '',
              dto.userId ?? undefined,
              (dto.value as number) ?? 1,
              dto.meta ?? undefined
            );
            break;
          case AnalyticsEventType.PURCHASE:
            await this.queue.recordPurchase(
              dto.storeId ?? '',
              dto.productId ?? '',
              dto.userId ?? '',
              (dto.value as number) ?? 0,
              dto.meta ?? undefined
            );
            break;
          case AnalyticsEventType.CLICK:
            await this.queue.recordClick(
              dto.storeId ?? undefined,
              dto.productId ?? undefined,
              dto.userId ?? undefined,
              dto.meta ?? undefined
            );
            break;
          default:
            await this.queue.addEvent(dto);
        }
      } catch (err) {
        this.logger.warn(
          'RecordEventInterceptor enqueue error: ' + (err as any)?.message
        );
      }
    };

    const when = opts.when ?? 'after';
    if (when === 'before') {
      // fire-and-forget
      enqueue().catch(() => undefined);
      return next.handle();
    } else {
      return next.handle().pipe(
        tap(() => {
          enqueue().catch(() => undefined);
        })
      );
    }
  }
}
