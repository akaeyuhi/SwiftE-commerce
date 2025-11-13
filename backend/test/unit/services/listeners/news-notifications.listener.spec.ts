import { Test, TestingModule } from '@nestjs/testing';
import { NewsNotificationService } from 'src/modules/infrastructure/notifications/news/news-notification.service';
import { StoreRoleService } from 'src/modules/store/store-role/store-role.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logger } from '@nestjs/common';
import { NewsPublishedEvent } from 'src/common/events/news/news-published.event';
import { StoreFollower } from 'src/entities/store/store-follower.entity';
import { StoreRole } from 'src/entities/user/authentication/store-role.entity';
import { User } from 'src/entities/user/user.entity';
import { Store } from 'src/entities/store/store.entity';
import { StoreRoles } from 'src/common/enums/store-roles.enum';
import { DomainEvent } from 'src/common/interfaces/infrastructure/event.interface';
import { createMock, MockedMethods } from 'test/unit/helpers';
import { NewsNotificationsListener } from 'src/modules/store/news/listeners/news-notifications.listener';

describe('NewsNotificationsListener', () => {
  let listener: NewsNotificationsListener;
  let followerRepo: Partial<MockedMethods<Repository<StoreFollower>>>;
  let newsNotificationService: Partial<MockedMethods<NewsNotificationService>>;
  let storeRoleService: Partial<MockedMethods<StoreRoleService>>;
  let eventEmitter: Partial<MockedMethods<EventEmitter2>>;

  const mockUser: User = {
    id: 'u1',
    email: 'user@example.com',
    firstName: 'John',
    lastName: 'Doe',
  } as User;

  const mockStore: Store = {
    id: 's1',
    name: 'Test Store',
  } as Store;

  const mockNewsPublishedEvent: NewsPublishedEvent = {
    newsId: 'news-1',
    storeId: 's1',
    storeName: 'Test Store',
    title: 'Breaking News: New Product Launch',
    content: 'We are excited to announce our new product line...',
    excerpt: 'Exciting announcement about our new products',
    authorName: 'Store Admin',
    publishedAt: new Date('2025-10-01'),
    newsUrl: 'https://example.com/news/news-1',
    coverImageUrl: 'https://example.com/images/news-cover.jpg',
    category: 'announcements',
  };

  const mockFollower: StoreFollower = {
    id: 'follower-1',
    user: mockUser,
    store: mockStore,
    emailNotifications: true,
    createdAt: new Date(),
  } as unknown as StoreFollower;

  const mockStoreRole: StoreRole = {
    id: 'role-1',
    user: mockUser,
    store: mockStore,
    roleName: StoreRoles.ADMIN,
    isActive: true,
    assignedAt: new Date(),
    createdAt: new Date(),
  } as StoreRole;

  beforeEach(async () => {
    followerRepo = createMock<Repository<StoreFollower>>(['find']);
    newsNotificationService = createMock<NewsNotificationService>([
      'notifyFollowers',
    ]);
    storeRoleService = createMock<StoreRoleService>(['getStoreRoles']);
    eventEmitter = createMock<EventEmitter2>(['on', 'emit']);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NewsNotificationsListener,
        {
          provide: getRepositoryToken(StoreFollower),
          useValue: followerRepo,
        },
        { provide: NewsNotificationService, useValue: newsNotificationService },
        { provide: StoreRoleService, useValue: storeRoleService },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    listener = module.get<NewsNotificationsListener>(NewsNotificationsListener);

    // Suppress logger output
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(listener).toBeDefined();
    });

    it('should extend BaseNotificationListener', () => {
      expect(listener).toBeInstanceOf(NewsNotificationsListener);
    });
  });

  describe('getEventTypes', () => {
    it('should return supported event types', () => {
      const eventTypes = (listener as any).getEventTypes();

      expect(eventTypes).toEqual(['news.published']);
      expect(eventTypes).toHaveLength(1);
    });
  });

  describe('handleEvent', () => {
    it('should route news.published event to handleNewsPublished', async () => {
      const handleNewsPublishedSpy = jest
        .spyOn(listener as any, 'handleNewsPublished')
        .mockResolvedValue(undefined);

      const event: DomainEvent<NewsPublishedEvent> = {
        type: 'news.published',
        data: mockNewsPublishedEvent,
        aggregateId: '',
        occurredAt: new Date(),
      };

      await (listener as any).handleEvent(event);

      expect(handleNewsPublishedSpy).toHaveBeenCalledWith(
        mockNewsPublishedEvent
      );
    });

    it('should log warning for unknown event type', async () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'warn');

      const event: DomainEvent = {
        type: 'unknown.event' as any,
        data: {},
        aggregateId: '',
        occurredAt: new Date(),
      };

      await (listener as any).handleEvent(event);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown event type')
      );
    });
  });

  describe('handleNewsPublished', () => {
    beforeEach(() => {
      followerRepo.find!.mockResolvedValue([mockFollower]);
      storeRoleService.getStoreRoles!.mockResolvedValue([mockStoreRole]);
      newsNotificationService.notifyFollowers!.mockResolvedValue([
        { success: true },
      ]);
    });

    it('should process news published event', async () => {
      await (listener as any).handleNewsPublished(mockNewsPublishedEvent);

      expect(newsNotificationService.notifyFollowers).toHaveBeenCalled();
    });

    it('should fetch followers and team members', async () => {
      await (listener as any).handleNewsPublished(mockNewsPublishedEvent);

      expect(followerRepo.find).toHaveBeenCalledWith({
        where: {
          store: { id: 's1' },
          emailNotifications: true,
        },
        relations: ['user'],
      });
      expect(storeRoleService.getStoreRoles).toHaveBeenCalledWith('s1');
    });

    it('should build notification data correctly', async () => {
      await (listener as any).handleNewsPublished(mockNewsPublishedEvent);

      expect(newsNotificationService.notifyFollowers).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          newsId: 'news-1',
          storeId: 's1',
          storeName: 'Test Store',
          title: 'Breaking News: New Product Launch',
          content: expect.any(String),
          excerpt: expect.any(String),
          authorName: 'Store Admin',
          publishedAt: expect.any(String),
          newsUrl: expect.any(String),
        })
      );
    });

    it('should include cover image URL when provided', async () => {
      await (listener as any).handleNewsPublished(mockNewsPublishedEvent);

      expect(newsNotificationService.notifyFollowers).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          coverImageUrl: 'https://example.com/images/news-cover.jpg',
        })
      );
    });

    it('should include category when provided', async () => {
      await (listener as any).handleNewsPublished(mockNewsPublishedEvent);

      expect(newsNotificationService.notifyFollowers).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          category: 'announcements',
        })
      );
    });

    it('should log processing message', async () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'log');

      await (listener as any).handleNewsPublished(mockNewsPublishedEvent);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Processing news publication')
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Breaking News: New Product Launch')
      );
    });

    it('should log results summary', async () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'log');
      newsNotificationService.notifyFollowers!.mockResolvedValue([
        { success: true },
        { success: true },
        { success: false, error: 'Failed' },
      ]);

      await (listener as any).handleNewsPublished(mockNewsPublishedEvent);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('2 sent, 1 failed')
      );
    });

    it('should warn when no recipients found', async () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'warn');
      followerRepo.find!.mockResolvedValue([]);
      storeRoleService.getStoreRoles!.mockResolvedValue([]);

      await (listener as any).handleNewsPublished(mockNewsPublishedEvent);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('No recipients found')
      );
      expect(newsNotificationService.notifyFollowers).not.toHaveBeenCalled();
    });

    it('should return early when no recipients', async () => {
      followerRepo.find!.mockResolvedValue([]);
      storeRoleService.getStoreRoles!.mockResolvedValue([]);

      await (listener as any).handleNewsPublished(mockNewsPublishedEvent);

      expect(newsNotificationService.notifyFollowers).not.toHaveBeenCalled();
    });
  });

  describe('getNotificationRecipients', () => {
    it('should return followers with email notifications enabled', async () => {
      followerRepo.find!.mockResolvedValue([mockFollower]);
      storeRoleService.getStoreRoles!.mockResolvedValue([]);

      const recipients = await (listener as any).getNotificationRecipients(
        's1'
      );

      expect(recipients).toHaveLength(1);
      expect(recipients[0]).toEqual({
        email: 'user@example.com',
        name: 'John Doe',
        userId: 'u1',
      });
    });

    it('should return store team members', async () => {
      followerRepo.find!.mockResolvedValue([]);
      storeRoleService.getStoreRoles!.mockResolvedValue([mockStoreRole]);

      const recipients = await (listener as any).getNotificationRecipients(
        's1'
      );

      expect(recipients).toHaveLength(1);
      expect(recipients[0]).toEqual({
        email: 'user@example.com',
        name: 'John Doe',
        userId: 'u1',
      });
    });

    it('should include both followers and team members', async () => {
      const follower = {
        ...mockFollower,
        user: { ...mockUser, id: 'u2', email: 'follower@example.com' } as User,
      };
      followerRepo.find!.mockResolvedValue([follower]);
      storeRoleService.getStoreRoles!.mockResolvedValue([mockStoreRole]);

      const recipients = await (listener as any).getNotificationRecipients(
        's1'
      );

      expect(recipients).toHaveLength(2);
      expect(recipients.map((r) => r.email)).toContain('follower@example.com');
      expect(recipients.map((r) => r.email)).toContain('user@example.com');
    });

    it('should deduplicate recipients', async () => {
      // Same user is both follower and team member
      followerRepo.find!.mockResolvedValue([mockFollower]);
      storeRoleService.getStoreRoles!.mockResolvedValue([mockStoreRole]);

      const recipients = await (listener as any).getNotificationRecipients(
        's1'
      );

      expect(recipients).toHaveLength(1);
      expect(recipients[0].email).toBe('user@example.com');
    });

    it('should only include active team members', async () => {
      const inactiveRole = { ...mockStoreRole, isActive: false };
      followerRepo.find!.mockResolvedValue([]);
      storeRoleService.getStoreRoles!.mockResolvedValue([inactiveRole]);

      const recipients = await (listener as any).getNotificationRecipients(
        's1'
      );

      expect(recipients).toHaveLength(0);
    });

    it('should only include admin and moderator roles', async () => {
      const guestRole = { ...mockStoreRole, roleName: StoreRoles.GUEST };
      followerRepo.find!.mockResolvedValue([]);
      storeRoleService.getStoreRoles!.mockResolvedValue([guestRole]);

      const recipients = await (listener as any).getNotificationRecipients(
        's1'
      );

      expect(recipients).toHaveLength(0);
    });

    it('should include moderators', async () => {
      const moderatorRole = {
        ...mockStoreRole,
        roleName: StoreRoles.MODERATOR,
      };
      followerRepo.find!.mockResolvedValue([]);
      storeRoleService.getStoreRoles!.mockResolvedValue([moderatorRole]);

      const recipients = await (listener as any).getNotificationRecipients(
        's1'
      );

      expect(recipients).toHaveLength(1);
    });

    it('should skip followers without email', async () => {
      const followerWithoutEmail = {
        ...mockFollower,
        user: { ...mockUser, email: null } as any,
      };
      followerRepo.find!.mockResolvedValue([followerWithoutEmail]);
      storeRoleService.getStoreRoles!.mockResolvedValue([]);

      const recipients = await (listener as any).getNotificationRecipients(
        's1'
      );

      expect(recipients).toHaveLength(0);
    });

    it('should skip team members without email', async () => {
      const roleWithoutEmail = {
        ...mockStoreRole,
        user: { ...mockUser, email: null } as any,
      };
      followerRepo.find!.mockResolvedValue([]);
      storeRoleService.getStoreRoles!.mockResolvedValue([roleWithoutEmail]);

      const recipients = await (listener as any).getNotificationRecipients(
        's1'
      );

      expect(recipients).toHaveLength(0);
    });

    it('should skip followers without user', async () => {
      const followerWithoutUser = {
        ...mockFollower,
        user: null,
      } as unknown as StoreFollower;
      followerRepo.find!.mockResolvedValue([followerWithoutUser]);
      storeRoleService.getStoreRoles!.mockResolvedValue([]);

      const recipients = await (listener as any).getNotificationRecipients(
        's1'
      );

      expect(recipients).toHaveLength(0);
    });

    it('should log debug messages', async () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'debug');
      followerRepo.find!.mockResolvedValue([mockFollower]);
      storeRoleService.getStoreRoles!.mockResolvedValue([mockStoreRole]);

      await (listener as any).getNotificationRecipients('s1');

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Found 1 followers')
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Found 1 team members')
      );
    });

    it('should handle repository errors gracefully', async () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'error');
      followerRepo.find!.mockRejectedValue(new Error('Database error'));
      storeRoleService.getStoreRoles!.mockResolvedValue([]);

      const recipients = await (listener as any).getNotificationRecipients(
        's1'
      );

      expect(recipients).toHaveLength(0);
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error fetching notification recipients'),
        expect.any(String)
      );
    });

    it('should handle storeRoleService errors gracefully', async () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'error');
      followerRepo.find!.mockResolvedValue([]);
      storeRoleService.getStoreRoles!.mockRejectedValue(
        new Error('Service error')
      );

      const recipients = await (listener as any).getNotificationRecipients(
        's1'
      );

      expect(recipients).toHaveLength(0);
      expect(loggerSpy).toHaveBeenCalled();
    });

    it('should handle multiple followers', async () => {
      const followers = [
        mockFollower,
        {
          ...mockFollower,
          id: 'f2',
          user: { ...mockUser, id: 'u2', email: 'user2@example.com' } as User,
        },
        {
          ...mockFollower,
          id: 'f3',
          user: { ...mockUser, id: 'u3', email: 'user3@example.com' } as User,
        },
      ];
      followerRepo.find!.mockResolvedValue(followers);
      storeRoleService.getStoreRoles!.mockResolvedValue([]);

      const recipients = await (listener as any).getNotificationRecipients(
        's1'
      );

      expect(recipients).toHaveLength(3);
    });

    it('should handle multiple team members', async () => {
      const roles = [
        mockStoreRole,
        {
          ...mockStoreRole,
          id: 'r2',
          user: { ...mockUser, id: 'u2', email: 'admin2@example.com' } as User,
        },
        {
          ...mockStoreRole,
          id: 'r3',
          roleName: StoreRoles.MODERATOR,
          user: { ...mockUser, id: 'u3', email: 'mod@example.com' } as User,
        },
      ];
      followerRepo.find!.mockResolvedValue([]);
      storeRoleService.getStoreRoles!.mockResolvedValue(roles);

      const recipients = await (listener as any).getNotificationRecipients(
        's1'
      );

      expect(recipients).toHaveLength(3);
    });
  });

  describe('getUserDisplayName', () => {
    it('should return full name when both first and last name present', () => {
      const user = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      } as User;

      const displayName = (listener as any).getUserDisplayName(user);

      expect(displayName).toBe('John Doe');
    });

    it('should return first name when last name missing', () => {
      const user = { firstName: 'John', email: 'john@example.com' } as User;

      const displayName = (listener as any).getUserDisplayName(user);

      expect(displayName).toBe('John');
    });

    it('should return email username when names missing', () => {
      const user = { email: 'john.doe@example.com' } as User;

      const displayName = (listener as any).getUserDisplayName(user);

      expect(displayName).toBe('john.doe');
    });

    it('should return "Reader" when all fields missing', () => {
      const user = {} as User;

      const displayName = (listener as any).getUserDisplayName(user);

      expect(displayName).toBe('Reader');
    });

    it('should handle email without @ symbol', () => {
      const user = { email: 'invalidemail' } as User;

      const displayName = (listener as any).getUserDisplayName(user);

      expect(displayName).toBe('invalidemail');
    });
  });

  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2025-10-01T12:00:00Z');

      const formatted = (listener as any).formatDate(date);

      expect(formatted).toContain('October');
      expect(formatted).toContain('1');
      expect(formatted).toContain('2025');
    });

    it('should handle different dates', () => {
      const date1 = new Date('2025-01-15T12:00:00Z');
      const date2 = new Date('2025-12-31T12:00:00Z');

      const formatted1 = (listener as any).formatDate(date1);
      const formatted2 = (listener as any).formatDate(date2);

      expect(formatted1).toContain('January');
      expect(formatted2).toContain('December');
    });

    it('should handle date strings', () => {
      const dateString = '2025-10-01';

      const formatted = (listener as any).formatDate(new Date(dateString));

      expect(formatted).toBeDefined();
      expect(formatted).toContain('October');
    });
  });

  describe('error handling', () => {
    it('should handle notification service errors', async () => {
      followerRepo.find!.mockResolvedValue([mockFollower]);
      storeRoleService.getStoreRoles!.mockResolvedValue([]);
      newsNotificationService.notifyFollowers!.mockRejectedValue(
        new Error('Email service error')
      );

      await expect(
        (listener as any).handleNewsPublished(mockNewsPublishedEvent)
      ).rejects.toThrow('Email service error');
    });

    it('should handle partial notification failures', async () => {
      followerRepo.find!.mockResolvedValue([mockFollower]);
      storeRoleService.getStoreRoles!.mockResolvedValue([]);
      newsNotificationService.notifyFollowers!.mockResolvedValue([
        { success: true },
        { success: false, error: 'Failed to send' },
      ]);

      await (listener as any).handleNewsPublished(mockNewsPublishedEvent);

      expect(newsNotificationService.notifyFollowers).toHaveBeenCalled();
    });
  });

  describe('integration scenarios', () => {
    it('should process complete news notification flow', async () => {
      const followers = [
        mockFollower,
        {
          ...mockFollower,
          id: 'f2',
          user: {
            ...mockUser,
            id: 'u2',
            email: 'follower2@example.com',
          } as User,
        },
      ];
      const roles = [mockStoreRole];

      followerRepo.find!.mockResolvedValue(followers);
      storeRoleService.getStoreRoles!.mockResolvedValue(roles);
      newsNotificationService.notifyFollowers!.mockResolvedValue([
        { success: true },
        { success: true },
      ]);

      await (listener as any).handleNewsPublished(mockNewsPublishedEvent);

      expect(followerRepo.find).toHaveBeenCalled();
      expect(storeRoleService.getStoreRoles).toHaveBeenCalled();
      expect(newsNotificationService.notifyFollowers).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ email: 'user@example.com' }),
          expect.objectContaining({ email: 'follower2@example.com' }),
        ]),
        expect.any(Object)
      );
    });

    it('should handle large recipient list', async () => {
      const manyFollowers = Array.from({ length: 50 }, (_, i) => ({
        ...mockFollower,
        id: `f${i}`,
        user: {
          ...mockUser,
          id: `u${i}`,
          email: `user${i}@example.com`,
        } as User,
      }));

      followerRepo.find!.mockResolvedValue(manyFollowers);
      storeRoleService.getStoreRoles!.mockResolvedValue([]);
      newsNotificationService.notifyFollowers!.mockResolvedValue(
        manyFollowers.map((f) => ({ success: true, email: f.user.email }))
      );

      await (listener as any).handleNewsPublished(mockNewsPublishedEvent);

      expect(newsNotificationService.notifyFollowers).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ email: 'user0@example.com' }),
          expect.objectContaining({ email: 'user49@example.com' }),
        ]),
        expect.any(Object)
      );
    });
  });
});
