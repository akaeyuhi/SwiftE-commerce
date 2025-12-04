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
import { AnalyticsService } from 'src/modules/analytics/analytics.service';
import { RecordEventDto } from 'src/modules/infrastructure/queues/analytics-queue/dto/record-event.dto';

/**
 * RecordEventInterceptor (Refactored)
 *
 * Intercepts HTTP requests and emits analytics events to RabbitMQ via AnalyticsService.
 */
@Injectable()
export class RecordEventInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RecordEventInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly analyticsService: AnalyticsService
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const handler = context.getHandler();
    const controller = context.getClass();

    // 1. Resolve Metadata
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
    if (!req) return next.handle();

    const when = opts.when ?? 'after';

    // 2. Helper: Read value from Request
    const readFromRequest = (spec?: PathSpec | number) => {
      if (spec === undefined || spec === null) return undefined;
      if (typeof spec !== 'string') return spec;

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

    // 3. Helper: Read value from Result
    const readFromResult = (result: any, spec?: PathSpec | number) => {
      if (spec === undefined || spec === null) return undefined;
      if (typeof spec !== 'string') return spec;
      if (!result) return undefined;

      const parts = spec.split('.');
      let cur: any = result;
      for (const p of parts) {
        if (cur === null || cur === undefined) return undefined;
        cur = cur[p];
      }
      return cur;
    };

    // 4. Construction & Sending Logic
    const buildAndEnqueue = async (resultIfAny?: any) => {
      try {
        const fromResult = (s?: PathSpec | number) =>
          resultIfAny !== undefined
            ? readFromResult(resultIfAny, s)
            : undefined;
        const fromReq = (s?: PathSpec | number) => readFromRequest(s);

        // Resolution Priority: Result > Configured Path > Auto-Guess from Params/Body
        const resolvedStoreId =
          (when === 'after' ? fromResult(opts.storeId) : undefined) ??
          fromReq(opts.storeId) ??
          fromReq('params.storeId');

        const resolvedProductId =
          (when === 'after' ? fromResult(opts.productId) : undefined) ??
          fromReq(opts.productId) ??
          fromReq('params.productId') ??
          fromReq('params.id') ??
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

        // Validation: Skip if context is missing (e.g., product event without productId)
        if (invokedOn === 'product' && !dto.productId) return;
        if (invokedOn === 'store' && !dto.storeId) return;

        // --- NEW: Simplified Emission ---
        // Instead of switch/case on event types, we just send the DTO.
        // The Microservice knows how to handle different eventTypes.
        await this.analyticsService.trackEvent(dto);
      } catch (err) {
        // Fail silent to not disrupt the main API response
        this.logger.warn(
          'RecordEventInterceptor enqueue error: ' + (err as any)?.message
        );
      }
    };

    // 5. Execution Flow
    if (when === 'before') {
      void buildAndEnqueue(undefined);
      return next.handle();
    }

    return next.handle().pipe(
      tap(async (result) => {
        await buildAndEnqueue(result);
      })
    );
  }
}
