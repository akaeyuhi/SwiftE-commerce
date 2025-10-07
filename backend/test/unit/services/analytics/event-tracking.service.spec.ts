import { Test, TestingModule } from '@nestjs/testing';
import { EventTrackingService } from 'src/modules/analytics/services/event-tracking.service';
import { AnalyticsQueueService } from 'src/modules/infrastructure/queues/analytics-queue/analytics-queue.service';
import { AnalyticsEventRepository } from 'src/modules/analytics/repositories/analytics-event.repository';
import { RecordEventDto } from 'src/modules/infrastructure/queues/analytics-queue/dto/record-event.dto';
import { AnalyticsEventType } from 'src/entities/infrastructure/analytics/analytics-event.entity';
import { createMock, MockedMethods } from 'test/unit/helpers';

describe('EventTrackingService', () => {
  let service: EventTrackingService;
  let queueService: Partial<MockedMethods<AnalyticsQueueService>>;
  let eventsRepo: Partial<MockedMethods<AnalyticsEventRepository>>;

  beforeEach(async () => {
    queueService = createMock<AnalyticsQueueService>(['addEvent']);
    eventsRepo = createMock<AnalyticsEventRepository>(['createEntity']);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventTrackingService,
        { provide: AnalyticsQueueService, useValue: queueService },
        { provide: AnalyticsEventRepository, useValue: eventsRepo },
      ],
    }).compile();

    service = module.get<EventTrackingService>(EventTrackingService);
    jest.clearAllMocks();
  });

  describe('trackEvent', () => {
    it('should queue event for processing', async () => {
      const dto: RecordEventDto = {
        storeId: 's1',
        eventType: AnalyticsEventType.VIEW,
        invokedOn: 'product',
      };

      queueService.addEvent!.mockResolvedValue('job-123' as any);

      await service.trackEvent(dto);

      expect(queueService.addEvent).toHaveBeenCalledWith(dto);
      expect(queueService.addEvent).toHaveBeenCalledTimes(1);
    });

    it('should handle queue failures', async () => {
      const dto: RecordEventDto = {
        storeId: 's1',
        eventType: AnalyticsEventType.VIEW,
        invokedOn: 'product',
      };

      queueService.addEvent!.mockRejectedValue(new Error('Queue full'));

      await expect(service.trackEvent(dto)).rejects.toThrow('Queue full');
    });
  });

  describe('recordEvent', () => {
    it('should create event directly', async () => {
      const dto: RecordEventDto = {
        storeId: 's1',
        productId: 'p1',
        userId: 'u1',
        eventType: AnalyticsEventType.PURCHASE,
        value: 100,
        meta: { source: 'web' },
        invokedOn: 'product',
      };

      const createdEvent = { id: 'e1', ...dto };
      eventsRepo.createEntity!.mockResolvedValue(createdEvent as any);

      const result = await service.recordEvent(dto);

      expect(result).toEqual(createdEvent);
      expect(eventsRepo.createEntity).toHaveBeenCalledWith({
        storeId: 's1',
        productId: 'p1',
        userId: 'u1',
        eventType: AnalyticsEventType.PURCHASE,
        value: 100,
        meta: { source: 'web' },
        invokedOn: 'product',
      });
    });

    it('should set defaults for missing fields', async () => {
      const dto: RecordEventDto = {
        eventType: AnalyticsEventType.VIEW,
      } as any;

      eventsRepo.createEntity!.mockResolvedValue({ id: 'e1' } as any);

      await service.recordEvent(dto);

      expect(eventsRepo.createEntity).toHaveBeenCalledWith({
        storeId: null,
        productId: null,
        userId: null,
        eventType: AnalyticsEventType.VIEW,
        value: null,
        meta: null,
        invokedOn: 'store',
      });
    });

    it('should infer invokedOn from productId', async () => {
      const dto: RecordEventDto = {
        productId: 'p1',
        eventType: AnalyticsEventType.VIEW,
      } as any;

      eventsRepo.createEntity!.mockResolvedValue({} as any);

      await service.recordEvent(dto);

      expect(eventsRepo.createEntity).toHaveBeenCalledWith(
        expect.objectContaining({ invokedOn: 'product' })
      );
    });
  });

  describe('batchTrack', () => {
    it('should track multiple events successfully', async () => {
      const events: RecordEventDto[] = [
        {
          storeId: 's1',
          eventType: AnalyticsEventType.VIEW,
          invokedOn: 'product',
        },
        {
          storeId: 's1',
          eventType: AnalyticsEventType.PURCHASE,
          invokedOn: 'product',
        },
        {
          storeId: 's1',
          eventType: AnalyticsEventType.ADD_TO_CART,
          invokedOn: 'product',
        },
      ];

      queueService.addEvent!.mockResolvedValue('job' as any);

      const result = await service.batchTrack(events);

      expect(result.success).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(queueService.addEvent).toHaveBeenCalledTimes(3);
    });

    it('should handle partial failures', async () => {
      const events: RecordEventDto[] = [
        {
          storeId: 's1',
          eventType: AnalyticsEventType.VIEW,
          invokedOn: 'product',
        },
        {
          storeId: 's1',
          eventType: AnalyticsEventType.PURCHASE,
          invokedOn: 'product',
        },
      ];

      queueService
        .addEvent!.mockResolvedValueOnce('job1' as any)
        .mockRejectedValueOnce(new Error('Queue error'));

      const result = await service.batchTrack(events);

      expect(result.success).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].event).toEqual(events[1]);
      expect(result.errors[0].error).toBe('Queue error');
    });

    it('should handle empty batch', async () => {
      const result = await service.batchTrack([]);

      expect(result.success).toBe(0);
      expect(result.failed).toBe(0);
      expect(queueService.addEvent).not.toHaveBeenCalled();
    });

    it('should continue processing after errors', async () => {
      const events: RecordEventDto[] = [
        {
          storeId: 's1',
          eventType: AnalyticsEventType.VIEW,
          invokedOn: 'product',
        },
        {
          storeId: 's1',
          eventType: AnalyticsEventType.PURCHASE,
          invokedOn: 'product',
        },
        {
          storeId: 's1',
          eventType: AnalyticsEventType.ADD_TO_CART,
          invokedOn: 'product',
        },
      ];

      queueService
        .addEvent!.mockRejectedValueOnce(new Error('Error 1'))
        .mockResolvedValueOnce('job2' as any)
        .mockRejectedValueOnce(new Error('Error 3'));

      const result = await service.batchTrack(events);

      expect(result.success).toBe(1);
      expect(result.failed).toBe(2);
      expect(result.errors).toHaveLength(2);
    });
  });
});
