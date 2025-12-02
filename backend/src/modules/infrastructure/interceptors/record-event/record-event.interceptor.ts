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
  PathSpec,
  RECORD_EVENT_META,
  RECORD_EVENTS_MAP_META,
  RecordEventOptions,
} from 'src/common/decorators/record-event.decorator';
import { AnalyticsQueueService } from 'src/modules/infrastructure/queues/analytics-queue/analytics-queue.service';
import { AnalyticsEventType } from 'src/entities/infrastructure/analytics/analytics-event.entity';
import { RecordEventDto } from 'src/modules/infrastructure/queues/analytics-queue/dto/record-event.dto';

/**
 * RecordEventInterceptor
 *
 * Reads metadata set by @RecordEvent or @RecordEvents and enqueues analytics events.
 *
 * Behavior highlights:
 * - supports reading values from request (params/query/body/headers/user) or from handler result.
 * - supports 'before' (use request data) and 'after' (prefer result then fallback to request).
 * - uses convenience queue.recordX methods when available (recordView, recordLike etc).
 * - best-effort: failures are logged and do NOT affect the main request.
 */
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

    // find metadata: per-handler or per-controller map
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

    // nothing to do
    if (!opts) return next.handle();

    const req = context.switchToHttp().getRequest();
    // safe guard
    if (!req) return next.handle();

    const when = opts.when ?? 'after';

    // Resolver: read a value from request object or from result (if provided)
    const readFromRequest = (spec?: PathSpec | number) => {
      if (spec === undefined || spec === null) return undefined;
      if (typeof spec !== 'string') return spec;
      // allowed roots
      const roots: Record<string, any> = {
        params: req.params,
        query: req.query,
        body: req.body,
        user: req.user,
        headers: req.headers,
        request: req,
      };
      const parts = spec.split('.');
      const first = parts[0];
      let cur = roots[first];
      if (cur === undefined) {
        // fallback: try direct keys on params/body/query/user
        if (parts.length === 1) {
          const key = parts[0];
          return (
            req.params?.[key] ??
            req.body?.[key] ??
            req.query?.[key] ??
            req.user?.[key]
          );
        }
        return undefined;
      }
      for (let i = 1; i < parts.length; i++) {
        if (cur === null || cur === undefined) return undefined;
        cur = cur[parts[i]];
      }
      return cur;
    };

    const readFromResult = (result: any, spec?: PathSpec | number) => {
      if (spec === undefined || spec === null) return undefined;
      if (typeof spec !== 'string') return spec;
      if (!result) return undefined;
      // support top-level `result.productId` or `result.product?.id`
      const parts = spec.split('.');
      let cur: any = result;
      for (const p of parts) {
        if (cur === null || cur === undefined) return undefined;
        cur = cur[p];
      }
      return cur;
    };

    // Build & enqueue DTO using either request or result (if after)
    const buildAndEnqueue = async (resultIfAny?: any) => {
      try {
        const fromResult = (s?: PathSpec | number) =>
          resultIfAny !== undefined
            ? readFromResult(resultIfAny, s)
            : undefined;
        const fromReq = (s?: PathSpec | number) => readFromRequest(s);

        // Prefer `result` values when available (for after hooks), fallback to request
        const resolvedStoreId =
          (when === 'after' ? fromResult(opts.storeId) : undefined) ??
          fromReq(opts.storeId) ??
          fromReq('params.id') ??
          fromReq('params.storeId') ??
          fromReq('body.productId');

        const resolvedProductId =
          (when === 'after' ? fromResult(opts.productId) : undefined) ??
          fromReq(opts.productId) ??
          fromReq('params.id') ??
          fromReq('params.productId') ??
          fromReq('body.productId');

        const resolvedUserId =
          (when === 'after' ? fromResult(opts.userId) : undefined) ??
          fromReq(opts.userId) ??
          (req.user ? (req.user.id ?? req.user.sub) : undefined);

        const resolvedValueRaw =
          typeof opts.value === 'number'
            ? opts.value
            : ((when === 'after' ? fromResult(opts.value as any) : undefined) ??
              fromReq(opts.value as any));

        const resolvedValue =
          resolvedValueRaw === undefined || resolvedValueRaw === null
            ? null
            : typeof resolvedValueRaw === 'string' &&
                !isNaN(Number(resolvedValueRaw))
              ? Number(resolvedValueRaw)
              : resolvedValueRaw;

        const resolvedMeta =
          (when === 'after' ? fromResult(opts.meta as any) : undefined) ??
          (typeof opts.meta === 'string'
            ? fromReq(opts.meta)
            : (opts.meta ?? fromReq('body.meta')));

        const invokedOn: 'store' | 'product' =
          opts.invokedOn ??
          (resolvedProductId ? 'product' : resolvedStoreId ? 'store' : 'store');

        const dto: RecordEventDto = {
          storeId: (resolvedStoreId as string) ?? null,
          productId: (resolvedProductId as string) ?? null,
          userId: (resolvedUserId as string) ?? null,
          eventType: (opts.eventType as any) ?? 'custom',
          invokedOn,
          value: (resolvedValue as any) ?? null,
          meta: (resolvedMeta as any) ?? null,
        };

        // If invokedOn indicates product/store presence and id missing -> skip
        if (invokedOn === 'product' && !dto.productId) return;
        if (invokedOn === 'store' && !dto.storeId) return;

        // use convenience helpers when available (recordView, recordLike, etc.)
        // These methods are optional — fall back to generic addEvent
        switch (opts.eventType) {
          case AnalyticsEventType.VIEW:
            if (typeof this.queue.recordView === 'function') {
              await this.queue.recordView(
                dto.storeId ?? undefined,
                dto.productId ?? undefined,
                dto.userId ?? undefined,
                dto.meta ?? undefined
              );
            } else {
              await this.queue.addEvent(dto);
            }
            break;
          case AnalyticsEventType.LIKE:
            if (typeof this.queue.recordLike === 'function') {
              await this.queue.recordLike(
                dto.storeId ?? undefined,
                dto.productId ?? undefined,
                dto.userId ?? undefined,
                dto.meta ?? undefined
              );
            } else {
              await this.queue.addEvent(dto);
            }
            break;
          case AnalyticsEventType.ADD_TO_CART:
            if (typeof this.queue.recordAddToCart === 'function') {
              await this.queue.recordAddToCart(
                dto.storeId ?? '',
                dto.productId ?? '',
                dto.userId ?? undefined,
                (dto.value as number) ?? 1,
                dto.meta ?? undefined
              );
            } else {
              await this.queue.addEvent(dto);
            }
            break;
          case AnalyticsEventType.PURCHASE:
            if (typeof this.queue.recordPurchase === 'function') {
              await this.queue.recordPurchase(
                dto.storeId ?? '',
                dto.productId ?? '',
                dto.userId ?? '',
                (dto.value as number) ?? 0,
                dto.meta ?? undefined
              );
            } else {
              await this.queue.addEvent(dto);
            }
            break;
          case AnalyticsEventType.CLICK:
            if (typeof this.queue.recordClick === 'function') {
              await this.queue.recordClick(
                dto.storeId ?? undefined,
                dto.productId ?? undefined,
                dto.userId ?? undefined,
                dto.meta ?? undefined
              );
            } else {
              await this.queue.addEvent(dto);
            }
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

    // when === before: enqueue immediately (fire-and-forget) and continue to handler
    if (when === 'before') {
      // don't await — best-effort
      void buildAndEnqueue(undefined);
      return next.handle();
    }

    // default: after
    return next.handle().pipe(
      tap(async (result) => {
        await buildAndEnqueue(result);
      })
    );
  }
}
