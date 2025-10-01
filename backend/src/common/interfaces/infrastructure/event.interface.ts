export interface DomainEvent<Data = any> {
  type: string;
  aggregateId: string;
  aggregateType: string;
  data: Data;
  version: number;
  occurredAt: Date;
  userId?: string;
  correlationId?: string;
}

export interface EventHandlerMetadata {
  eventType: string;
  version?: number;
  priority?: number;
  async?: boolean;
}
