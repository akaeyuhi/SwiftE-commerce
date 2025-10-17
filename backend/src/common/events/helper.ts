import { DomainEvent } from 'src/common/interfaces/infrastructure/event.interface';

export const domainEventFactory = <T>(
  type: string,
  id: string,
  data: T
): DomainEvent<T> => ({
  type,
  aggregateId: id,
  occurredAt: new Date(),
  data,
});
