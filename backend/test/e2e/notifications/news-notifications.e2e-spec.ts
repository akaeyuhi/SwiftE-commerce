import { INestApplication } from '@nestjs/common';
import { TestAppHelper } from '../helpers/test-app.helper';
import { AuthHelper } from '../helpers/auth.helper';
import { SeederHelper } from '../helpers/seeder.helper';
import { StoreModule } from 'src/modules/store/store.module';
import { UserModule } from 'src/modules/user/user.module';
import { NewsNotificationService } from 'src/modules/infrastructure/notifications/news/news-notification.service';
import {
  NotificationStatus,
  NotificationType,
} from 'src/common/enums/notification.enum';
import { AuthModule } from 'src/modules/auth/auth.module';
import { NotificationsModule } from 'src/modules/infrastructure/notifications/notifications.module';
import { randomUUID } from 'crypto';

describe('Notifications - News (E2E)', () => {
  let appHelper: TestAppHelper;
  let app: INestApplication;
  let authHelper: AuthHelper;
  let seeder: SeederHelper;
  let newsNotificationService: NewsNotificationService;

  let storeOwner: any;
  let follower1: any;
  let follower2: any;
  let store: any;

  beforeAll(async () => {
    appHelper = new TestAppHelper();
    app = await appHelper.initialize({
      imports: [NotificationsModule, StoreModule, AuthModule, UserModule],
    });
    authHelper = new AuthHelper(app, appHelper.getDataSource());
    seeder = new SeederHelper(appHelper.getDataSource());

    newsNotificationService = app.get(NewsNotificationService);

    storeOwner = await authHelper.createAuthenticatedUser();
    follower1 = await authHelper.createAuthenticatedUser();
    follower2 = await authHelper.createAuthenticatedUser();
    store = await seeder.seedStore(storeOwner.user);
  });

  afterAll(async () => {
    await appHelper.clearDatabase();
    await appHelper.cleanup();
  });

  afterEach(async () => {
    await appHelper.clearTables(['stores', 'news_notification_logs']);
  });

  describe('News Published Notifications', () => {
    it('should send news published notification', async () => {
      const uuid = randomUUID();
      await newsNotificationService.notifyNewsPublished(
        follower1.user.email,
        follower1.user.firstName,
        {
          newsId: uuid,
          storeId: store.id,
          storeName: store.name,
          title: 'Exciting Store Update!',
          excerpt: 'We have some great news to share...',
          content: 'Full content of the news post...',
          authorName: storeOwner.user.firstName,
          publishedAt: new Date().toISOString(),
          newsUrl: `https://example.com/stores/${store.id}/news/news-123`,
          unsubscribeUrl: `https://example.com/stores/${store.id}/unsubscribe`,
        },
        follower1.user.id
      );

      const logRepo = appHelper
        .getDataSource()
        .getRepository('NewsNotificationLog');
      const logs = await logRepo.find({ where: { newsId: uuid } });

      expect(logs.length).toBe(1);
      expect(logs[0].notificationType).toBe(NotificationType.NEWS_PUBLISHED);
      expect(logs[0].status).toBe(NotificationStatus.SENT);
    });

    it('should include unsubscribe link', async () => {
      const uuid = randomUUID();
      await newsNotificationService.notifyNewsPublished(
        follower1.user.email,
        follower1.user.firstName,
        {
          newsId: uuid,
          storeId: store.id,
          storeName: store.name,
          title: 'News with Unsubscribe',
          excerpt: 'Test excerpt',
          content: 'Test content',
          authorName: storeOwner.user.firstName,
          publishedAt: new Date().toISOString(),
          newsUrl: 'https://example.com',
          unsubscribeUrl: `https://example.com/unsubscribe?user=${follower1.user.id}`,
        }
      );

      const logRepo = appHelper
        .getDataSource()
        .getRepository('NewsNotificationLog');
      const logs = await logRepo.find({ where: { newsId: uuid } });

      expect(logs[0].payload.unsubscribeUrl).toContain('unsubscribe');
    });
  });

  describe('Batch Follower Notifications', () => {
    it('should send notifications to multiple followers', async () => {
      const uuid = randomUUID();
      const followers = [
        {
          email: follower1.user.email,
          name: follower1.user.firstName,
          userId: follower1.user.id,
        },
        {
          email: follower2.user.email,
          name: follower2.user.firstName,
          userId: follower2.user.id,
        },
      ];

      const newsData = {
        newsId: uuid,
        storeId: store.id,
        storeName: store.name,
        title: 'Batch News Update',
        excerpt: 'News for all followers',
        content: 'Full content here...',
        authorName: storeOwner.user.firstName,
        publishedAt: new Date().toISOString(),
        newsUrl: `https://example.com/news/news-batch-123`,
        unsubscribeUrl: '', // Will be generated per follower
      };

      const results = await newsNotificationService.notifyFollowers(
        followers,
        newsData
      );

      expect(results.length).toBe(2);
      expect(results.every((r) => r.success)).toBe(true);

      const logRepo = appHelper
        .getDataSource()
        .getRepository('NewsNotificationLog');
      const logs = await logRepo.find({ where: { newsId: uuid } });

      expect(logs.length).toBe(2);
      expect(logs.every((log) => log.status === NotificationStatus.SENT)).toBe(
        true
      );
    });

    it('should generate unique unsubscribe URLs for each follower', async () => {
      const uuid = randomUUID();
      const followers = [
        {
          email: follower1.user.email,
          name: 'Follower 1',
          userId: follower1.user.id,
        },
        {
          email: follower2.user.email,
          name: 'Follower 2',
          userId: follower2.user.id,
        },
      ];

      await newsNotificationService.notifyFollowers(followers, {
        newsId: uuid,
        storeId: store.id,
        storeName: store.name,
        title: 'Unsubscribe Test',
        excerpt: 'Test',
        content: 'Test',
        authorName: storeOwner.user.firstName,
        publishedAt: new Date().toISOString(),
        newsUrl: 'https://example.com',
        unsubscribeUrl: '', // Will be generated
      });

      const logRepo = appHelper
        .getDataSource()
        .getRepository('NewsNotificationLog');
      const logs = await logRepo.find({
        where: { newsId: uuid },
      });

      // Each log should have a unique unsubscribe URL
      const unsubscribeUrls = logs.map((log) => log.payload.unsubscribeUrl);
      expect(new Set(unsubscribeUrls).size).toBe(2);
    });
  });

  describe('Notification Statistics', () => {
    let uuid;
    beforeEach(async () => {
      uuid = randomUUID();
      await newsNotificationService.notifyNewsPublished(
        follower1.user.email,
        follower1.user.firstName,
        {
          newsId: uuid,
          storeId: store.id,
          storeName: store.name,
          title: 'Stats Test News',
          excerpt: 'Test',
          content: 'Test content',
          authorName: storeOwner.user.firstName,
          publishedAt: new Date().toISOString(),
          newsUrl: 'https://example.com',
          unsubscribeUrl: 'https://example.com/unsubscribe',
        }
      );
    });

    it('should get news notification statistics', async () => {
      const stats =
        await newsNotificationService.getNewsNotificationStats(uuid);

      expect(stats.total).toBe(1);
      expect(stats.sent).toBe(1);
      expect(stats.failed).toBe(0);
      expect(stats.pending).toBe(0);
    });

    it('should get store notification statistics', async () => {
      const since = new Date(Date.now() - 86400000);

      const stats = await newsNotificationService.getStoreNotificationStats(
        store.id,
        since
      );

      expect(stats.total).toBeGreaterThan(0);
      expect(stats.uniqueRecipients).toBeGreaterThan(0);
    });
  });

  describe('Validation', () => {
    it('should validate email format', async () => {
      const uuid = randomUUID();
      await expect(
        newsNotificationService.notifyNewsPublished(
          'invalid-email',
          'Test User',
          {
            newsId: uuid,
            storeId: store.id,
            storeName: store.name,
            title: 'Test',
            excerpt: 'Test',
            content: 'Test',
            authorName: 'Author',
            publishedAt: new Date().toISOString(),
            newsUrl: 'https://example.com',
            unsubscribeUrl: 'https://example.com/unsubscribe',
          }
        )
      ).rejects.toThrow('Invalid email');
    });

    it('should validate required fields', async () => {
      await expect(
        newsNotificationService.notifyNewsPublished(
          follower1.user.email,
          follower1.user.firstName,
          {
            newsId: null, // Missing required field
            storeId: store.id,
            storeName: store.name,
            title: 'Test',
            excerpt: 'Test',
            content: 'Test',
            authorName: 'Author',
            publishedAt: new Date(),
            newsUrl: 'https://example.com',
            unsubscribeUrl: 'https://example.com/unsubscribe',
          } as any
        )
      ).rejects.toThrow();
    });
  });
});
