import 'reflect-metadata';
import { AnalyticsEventType } from 'src/modules/analytics/entities/analytics-event.entity';

export const RECORD_EVENT_META = 'record:event:meta';
export const RECORD_EVENTS_MAP_META = 'record:events:map';

export type PathSpec = string; // e.g. 'params.storeId' | 'user.id' | 'body.productId'

export interface RecordEventOptions {
  eventType: AnalyticsEventType | string;
  storeId?: PathSpec;
  productId?: PathSpec;
  userId?: PathSpec;
  value?: PathSpec | number;
  meta?: PathSpec | Record<string, any>;
  invokedOn?: 'store' | 'product';
  when?: 'before' | 'after'; // run before or after handler; default 'after'
}

/**
 * Attach to a single handler method
 * Example: @RecordEvent({ eventType: AnalyticsEventType.VIEW, productId: 'params.id' })
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
