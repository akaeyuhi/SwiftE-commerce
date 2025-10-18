/**
 * Base domain event structure.
 */
export interface DomainEvent<T = any> {
  /**
   * Event type identifier (e.g., 'order.created', 'news.published')
   */
  type: string;

  /**
   * ID of the aggregate that produced this event
   */
  aggregateId: string;

  /**
   * Aggregate type (e.g., 'Order', 'NewsPost')
   */
  aggregateType?: string;

  /**
   * Event data payload
   */
  data: T;

  /**
   * When the event occurred
   */
  occurredAt: Date;

  /**
   * Event version for schema evolution
   */
  version?: number;

  /**
   * User who triggered the event (if applicable)
   */
  userId?: string;

  /**
   * Correlation ID for tracing
   */
  correlationId?: string;

  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Event handler metadata and configuration.
 */
export interface EventHandlerMetadata {
  /**
   * Event type pattern this handler processes
   */
  eventType: string;

  /**
   * Handler priority (lower number = higher priority)
   */
  priority?: number;

  /**
   * Whether to process events asynchronously
   */
  async?: boolean;

  /**
   * Handler description
   */
  description?: string;

  /**
   * Tags for categorization
   */
  tags?: string[];
}
