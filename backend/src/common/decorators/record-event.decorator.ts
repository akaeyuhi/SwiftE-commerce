import 'reflect-metadata';
import { AnalyticsEventType } from 'src/entities/infrastructure/analytics/analytics-event.entity';

export const RECORD_EVENT_META = 'record:event:meta';
export const RECORD_EVENTS_MAP_META = 'record:events:map';

/**
 * PathSpec is a dot-separated path where to read a value:
 * examples: 'params.storeId', 'user.id', 'body.productId'
 */
export type PathSpec = string;

export interface RecordEventOptions {
  /**
   * Event type (AnalyticsEventType or custom string)
   */
  eventType: AnalyticsEventType | string;

  /**
   * Where to read storeId / productId / userId / value / meta from.
   * If not provided the interceptor will try sensible defaults.
   */
  storeId?: PathSpec;
  productId?: PathSpec;
  userId?: PathSpec;

  /**
   * A number literal or PathSpec: e.g. 1 or 'body.quantity' or 'result.totalAmount'
   */
  value?: PathSpec | number;

  /**
   * Either PathSpec or inline metadata object
   */
  meta?: PathSpec | Record<string, any>;

  /**
   * Explicitly force invoked-on type, otherwise inferred from ids
   */
  invokedOn?: 'store' | 'product';

  /**
   * When to run: 'before' or 'after' handler execution. Default 'after'.
   * - 'after' will attempt to read created ids from handler result (preferred).
   * - 'before' will read from request objects (good for read-only endpoints).
   */
  when?: 'before' | 'after';
}

/**
 * Attach to a single handler method.
 *
 * Example:
 *  @RecordEvent({ eventType: AnalyticsEventType.VIEW, productId: 'params.id' })
 */
export function RecordEvent(opts: RecordEventOptions) {
  return (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) => {
    Reflect.defineMetadata(RECORD_EVENT_META, opts, descriptor.value);
    return descriptor;
  };
}

/**
 * Attach to a controller class to provide a mapping handlerName -> RecordEventOptions.
 * Useful to instrument inherited methods (e.g. `findOne` on BaseController).
 *
 * Example:
 * @RecordEvents({
 *   findOne: { eventType: AnalyticsEventType.VIEW, productId: 'params.id' }
 * })
 */
export function RecordEvents(map: Record<string, RecordEventOptions>) {
  return (target: any) => {
    Reflect.defineMetadata(RECORD_EVENTS_MAP_META, map, target);
    return target;
  };
}
