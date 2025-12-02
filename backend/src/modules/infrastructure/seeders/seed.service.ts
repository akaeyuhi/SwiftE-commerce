import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';

// Entities
import { User } from 'src/entities/user/user.entity';
import { Store } from 'src/entities/store/store.entity';
import { Category } from 'src/entities/store/product/category.entity';
import { Product } from 'src/entities/store/product/product.entity';
import { ProductVariant } from 'src/entities/store/product/variant.entity';
import { Inventory } from 'src/entities/store/product/inventory.entity';
import { Order } from 'src/entities/store/product/order.entity';
import { OrderItem } from 'src/entities/store/product/order-item.entity';
import { Review } from 'src/entities/store/review.entity';
import { NewsPost } from 'src/entities/store/news-post.entity';
import { AdminRoles } from 'src/common/enums/admin.enum';
import { OrderStatus } from 'src/common/enums/order-status.enum';
import { Admin } from 'src/entities/user/authentication/admin.entity';
import { StoreRole } from 'src/entities/user/authentication/store-role.entity';
import { StoreRoles } from 'src/common/enums/store-roles.enum';
import { ProductPhoto } from 'src/entities/store/product/product-photo.entity';
import { ProductDailyStats } from 'src/entities/infrastructure/analytics/product-daily-stats.entity';
import { StoreDailyStats } from 'src/entities/infrastructure/analytics/store-daily-stats.entity';
import {
  AnalyticsEvent,
  AnalyticsEventType,
} from 'src/entities/infrastructure/analytics/analytics-event.entity';
import { SeedingContextService } from 'src/database/subscribers/seeding-context.service';

@Injectable()
export class SeedService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Store)
    private readonly storeRepository: Repository<Store>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductVariant)
    private readonly variantRepository: Repository<ProductVariant>,
    @InjectRepository(Inventory)
    private readonly inventoryRepository: Repository<Inventory>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(NewsPost)
    private readonly newsPostRepository: Repository<NewsPost>,
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    @InjectRepository(StoreRole)
    private readonly storeRoleRepository: Repository<StoreRole>,
    @InjectRepository(ProductPhoto)
    private readonly productPhotoRepository: Repository<ProductPhoto>,
    @InjectRepository(ProductDailyStats)
    private readonly productDailyStatsRepository: Repository<ProductDailyStats>,
    @InjectRepository(StoreDailyStats)
    private readonly storeDailyStatsRepository: Repository<StoreDailyStats>,
    @InjectRepository(AnalyticsEvent)
    private readonly analyticsEventRepository: Repository<AnalyticsEvent>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly seedingContext: SeedingContextService
  ) {}

  async seed() {
    console.log('🚀 Starting database seed...');

    const startTime = Date.now();

    try {
      // Clear existing data
      await this.clearDatabase();

      this.seedingContext.startSeeding();

      // Create users
      const users = await this.seedUsers(30);
      console.log(`🌱 Seeded ${users.length} users`);

      // Create stores
      const stores = await this.seedStores(users, 10);
      console.log(`🌱 Seeded ${stores.length} stores`);

      // Create store roles
      const storeRoles = await this.seedStoreRoles(users, stores);
      console.log(`🌱 Seeded ${storeRoles.length} store roles`);

      // Create categories for each store
      const categories = await this.seedCategories(stores);
      console.log(`🌱 Seeded ${categories.length} categories`);

      // Create products for each store
      const products = await this.seedProducts(stores, categories);
      console.log(
        `🌱 Seeded ${products.length} products with variants, inventory, and photos`
      );

      // Create orders
      const orders = await this.seedOrders(users, stores, products);
      console.log(`🌱 Seeded ${orders.length} orders`);

      // Create analytics events
      const events = await this.seedAnalyticsEvents(orders, products, users);
      console.log(`🌱 Seeded ${events.length} analytics events`);

      // Create analytics data
      await this.seedAnalytics(events, products, stores);
      console.log('🌱 Seeded aggregated analytics data (daily stats)');

      // Create reviews
      const reviews = await this.seedReviews(users, products);
      console.log(`🌱 Seeded ${reviews.length} reviews`);

      // Create news posts
      const newsPosts = await this.seedNewsPosts(users, stores);
      console.log(`🌱 Seeded ${newsPosts.length} news posts`);

      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;

      console.log(
        `\n✅ Database seeding completed successfully in ${duration.toFixed(2)}s!`
      );

      this.seedingContext.endSeeding();
    } catch (error) {
      console.error('❌ Seeding failed:', error);
      throw error;
    } finally {
    }
  }

  async clearDatabase(): Promise<void> {
    if (!this.dataSource?.isInitialized) {
      throw new Error('DataSource is not initialized');
    }

    try {
      const entities = this.dataSource.entityMetadatas;

      // Disable foreign key checks temporarily
      await this.dataSource.query('SET session_replication_role = replica;');

      // Truncate all tables
      for (const entity of entities) {
        await this.dataSource.query(
          `TRUNCATE TABLE "${entity.tableName}" RESTART IDENTITY CASCADE`
        );
      }

      // Re-enable foreign key checks
      await this.dataSource.query('SET session_replication_role = DEFAULT;');

      console.log('✅ Database cleared successfully');
    } catch (error) {
      console.error('❌ Error clearing database:', error.message);
      throw error;
    }
  }

  private async seedUsers(count: number): Promise<User[]> {
    const users: User[] = [];
    const passwordHash = await bcrypt.hash('Password123!', 10);

    for (let i = 0; i < count; i++) {
      const user = this.userRepository.create({
        email: faker.internet.email(),
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        passwordHash,
        isEmailVerified: true,
        isActive: true,
        siteRole: AdminRoles.USER,
      });
      users.push(user);
    }

    // Create a default admin user
    const adminUser = this.userRepository.create({
      email: 'admin@swiftecommerce.com',
      firstName: 'Admin',
      lastName: 'User',
      passwordHash,
      isEmailVerified: true,
      isActive: true,
      siteRole: AdminRoles.ADMIN,
    });
    users.push(adminUser);
    const savedUsers = await this.userRepository.save(users);

    const admin = this.adminRepository.create({
      userId: savedUsers.find((u) => u.email === 'admin@swiftecommerce.com')!
        .id,
      isActive: true,
    });
    await this.adminRepository.save(admin);
    console.log('👑 Seeded site admin');

    return savedUsers;
  }

  private async seedStores(users: User[], count: number): Promise<Store[]> {
    const stores: Store[] = [];
    const availableUsers = [
      ...users.filter((u) => u.siteRole !== AdminRoles.ADMIN),
    ];

    for (let i = 0; i < count; i++) {
      const ownerIndex = faker.number.int({
        min: 0,
        max: availableUsers.length - 1,
      });
      const owner = availableUsers.splice(ownerIndex, 1)[0];

      if (owner) {
        const store = this.storeRepository.create({
          name: faker.company.name(),
          description: faker.company.catchPhrase(),
          ownerId: owner.id,
          logoUrl: faker.image.avatar(),
          bannerUrl: faker.image.url(),
        });
        stores.push(store);
      }
    }
    return this.storeRepository.save(stores);
  }

  private async seedStoreRoles(
    users: User[],
    stores: Store[]
  ): Promise<StoreRole[]> {
    const roles: StoreRole[] = [];
    const admin = await this.userRepository.findOne({
      where: {
        email: 'admin@swiftecommerce.com',
      },
    });
    for (const store of stores) {
      // Assign Owner
      roles.push(
        this.storeRoleRepository.create({
          storeId: store.id,
          userId: store.ownerId,
          roleName: StoreRoles.ADMIN,
          isActive: true,
          assignedBy: store.ownerId,
        })
      );

      roles.push(
        this.storeRoleRepository.create({
          storeId: store.id,
          userId: admin!.id,
          roleName: StoreRoles.ADMIN,
          isActive: true,
          assignedBy: store.ownerId,
        })
      );

      // Assign a store admin
      const storeAdmin = faker.helpers.arrayElement(
        users.filter((u) => u.id !== store.ownerId && u.id !== admin?.id)
      );
      roles.push(
        this.storeRoleRepository.create({
          storeId: store.id,
          userId: storeAdmin.id,
          roleName: StoreRoles.ADMIN,
          isActive: true,
          assignedBy: store.ownerId,
        })
      );

      // Assign a few staff members
      const staffUsers = faker.helpers.arrayElements(
        users.filter((u) => u.id !== store.ownerId && u.id !== storeAdmin.id),
        { min: 1, max: 3 }
      );
      for (const staff of staffUsers) {
        roles.push(
          this.storeRoleRepository.create({
            storeId: store.id,
            userId: staff.id,
            roleName: StoreRoles.MODERATOR,
          })
        );
      }
    }
    return this.storeRoleRepository.save(roles);
  }

  private async seedCategories(stores: Store[]): Promise<Category[]> {
    const categories: Category[] = [];
    for (const store of stores) {
      for (let i = 0; i < 5; i++) {
        const category = this.categoryRepository.create({
          storeId: store.id,
          name: faker.commerce.department(),
          description: faker.lorem.sentence(),
        });
        categories.push(category);
      }
    }
    return this.categoryRepository.save(categories);
  }

  private async seedProducts(
    stores: Store[],
    categories: Category[]
  ): Promise<Product[]> {
    const products: Product[] = [];
    for (const store of stores) {
      const storeCategories = categories.filter((c) => c.storeId === store.id);
      for (let i = 0; i < 20; i++) {
        const product = this.productRepository.create({
          storeId: store.id,
          name: faker.commerce.productName(),
          description: faker.commerce.productDescription(),
          categories: faker.helpers.arrayElements(storeCategories, {
            min: 1,
            max: 3,
          }),
        });

        const savedProduct = await this.productRepository.save(product);

        // Create Photos
        const photos: ProductPhoto[] = [];
        for (let k = 0; k < faker.number.int({ min: 2, max: 5 }); k++) {
          photos.push(
            this.productPhotoRepository.create({
              product: savedProduct,
              url: faker.image.urlPicsumPhotos(),
              isMain: k === 0,
            })
          );
        }
        await this.productPhotoRepository.save(photos);
        savedProduct.mainPhotoUrl = photos[0].url;
        await this.productRepository.save(savedProduct);

        // Create variants
        const variants: ProductVariant[] = [];
        for (let j = 0; j < faker.number.int({ min: 1, max: 4 }); j++) {
          const variant = this.variantRepository.create({
            productId: savedProduct.id,
            sku: faker.string.alphanumeric(8).toUpperCase(),
            productName: savedProduct.name,
            price: parseFloat(faker.commerce.price({ min: 10, max: 500 })),
            attributes: {
              color: faker.color.human(),
              size: faker.helpers.arrayElement(['S', 'M', 'L', 'XL']),
            },
          });
          const savedVariant = await this.variantRepository.save(variant);

          // Create inventory
          const inventory = this.inventoryRepository.create({
            variantId: savedVariant.id,
            storeId: store.id,
            quantity: faker.number.int({ min: 10, max: 200 }),
          });
          await this.inventoryRepository.save(inventory);
          variants.push(savedVariant);
        }
        savedProduct.variants = variants;
        products.push(savedProduct);
      }
    }
    return products;
  }

  private async seedOrders(
    users: User[],
    stores: Store[],
    products: Product[]
  ): Promise<Order[]> {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const orders: Order[] = [];

    for (let i = 0; i < 500; i++) {
      const user = faker.helpers.arrayElement(users);
      const store = faker.helpers.arrayElement(stores);
      const storeProducts = products.filter((p) => p.storeId === store.id);

      if (storeProducts.length === 0) continue;

      const orderItems: OrderItem[] = [];
      let totalAmount = 0;

      for (let j = 0; j < faker.number.int({ min: 1, max: 7 }); j++) {
        const product = faker.helpers.arrayElement(storeProducts);
        if (!product.variants || product.variants.length === 0) continue;
        const variant = faker.helpers.arrayElement(product.variants);
        const quantity = faker.number.int({ min: 1, max: 5 });
        const unitPrice = variant.price;
        const lineTotal = unitPrice * quantity;

        const orderItem = this.orderItemRepository.create({
          productName: product.name,
          sku: variant.sku,
          unitPrice,
          quantity,
          lineTotal,
          product: { id: product.id },
          variantId: variant.id,
        });
        orderItems.push(orderItem);
        totalAmount += lineTotal;
      }

      if (orderItems.length === 0) continue;

      const statusWeights = [
        { status: OrderStatus.SHIPPED, weight: 70 },
        { status: OrderStatus.PENDING, weight: 15 },
        { status: OrderStatus.PROCESSING, weight: 10 },
        { status: OrderStatus.CANCELLED, weight: 5 },
      ];

      const totalWeight = statusWeights.reduce((sum, w) => sum + w.weight, 0);
      const random = faker.number.int({ min: 1, max: totalWeight });
      let cumulativeWeight = 0;
      let selectedStatus = OrderStatus.SHIPPED;

      for (const { status, weight } of statusWeights) {
        cumulativeWeight += weight;
        if (random <= cumulativeWeight) {
          selectedStatus = status;
          break;
        }
      }

      const order = this.orderRepository.create({
        userId: user.id,
        storeId: store.id,
        createdAt: faker.date.between({ from: ninetyDaysAgo, to: new Date() }),
        status: selectedStatus,
        totalAmount,
        shipping: {
          firstName: user.firstName,
          lastName: user.lastName,
          addressLine1: faker.location.streetAddress(),
          city: faker.location.city(),
          postalCode: faker.location.zipCode(),
          country: faker.location.countryCode(),
          phone: faker.phone.number(),
          email: user.email,
        },
        items: orderItems,
      });
      orders.push(order);
    }
    return this.orderRepository.save(orders);
  }

  private async seedReviews(
    users: User[],
    products: Product[]
  ): Promise<Review[]> {
    const reviews: Review[] = [];
    const usedCombinations = new Set<string>();

    for (let i = 0; i < 400; i++) {
      const user = faker.helpers.arrayElement(users);
      const product = faker.helpers.arrayElement(products);
      const key = `${user.id}-${product.id}`;

      if (usedCombinations.has(key)) continue;

      const review = this.reviewRepository.create({
        userId: user.id,
        productId: product.id,
        rating: faker.number.int({ min: 1, max: 5 }),
        title: faker.lorem.sentence(4),
        comment: faker.lorem.paragraph(),
      });
      reviews.push(review);
      usedCombinations.add(key);
    }
    return this.reviewRepository.save(reviews);
  }

  private async seedNewsPosts(
    users: User[],
    stores: Store[]
  ): Promise<NewsPost[]> {
    const newsPosts: NewsPost[] = [];
    for (const store of stores) {
      const storeRoles = await this.storeRoleRepository.find({
        where: { storeId: store.id },
        relations: ['user'],
      });
      const storeUsers = storeRoles.map((role) => role.user);

      if (storeUsers.length === 0) continue;

      for (let i = 0; i < faker.number.int({ min: 2, max: 5 }); i++) {
        const author = faker.helpers.arrayElement(storeUsers);
        const post = this.newsPostRepository.create({
          storeId: store.id,
          authorId: author.id,
          title: faker.lorem.sentence(),
          content: faker.lorem.paragraphs(3),
          tags: faker.helpers.arrayElements(
            ['promotion', 'new-product', 'announcement'],
            { min: 1, max: 2 }
          ),
          isPublished: true,
          publishedAt: faker.date.past(),
        });
        newsPosts.push(post);
      }
    }
    return this.newsPostRepository.save(newsPosts);
  }

  private async seedAnalytics(
    events: AnalyticsEvent[],
    products: Product[],
    stores: Store[]
  ): Promise<void> {
    const productStats: Record<string, Record<string, ProductDailyStats>> = {};
    const storeStats: Record<string, Record<string, StoreDailyStats>> = {};

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    for (let d = 0; d < 90; d++) {
      const date = new Date(ninetyDaysAgo);
      date.setDate(date.getDate() + d);
      const dateString = date.toISOString().split('T')[0];

      for (const product of products) {
        if (!productStats[product.id]) {
          productStats[product.id] = {};
        }
        productStats[product.id][dateString] =
          this.productDailyStatsRepository.create({
            productId: product.id,
            date: dateString,
            views: faker.number.int({ min: 0, max: 1000 }),
            revenue: faker.number.int({ min: 0, max: 1000 }),
            likes: faker.number.int({ min: 0, max: 100 }),
            addToCarts: faker.number.int({ min: 0, max: 150 }),
            purchases: faker.number.int({ min: 0, max: 100 }),
          });
      }

      for (const store of stores) {
        if (!storeStats[store.id]) {
          storeStats[store.id] = {};
        }
        storeStats[store.id][dateString] =
          this.storeDailyStatsRepository.create({
            storeId: store.id,
            date: dateString,
            views: 0,
            revenue: 0,
            likes: 0,
            checkouts: 0,
            addToCarts: 0,
            purchases: 0,
          });
      }
    }

    for (const event of events) {
      const dateString = (event.createdAt as Date).toISOString().split('T')[0];

      if (event.productId) {
        const pStat = productStats[event.productId]?.[dateString];
        if (pStat) {
          switch (event.eventType) {
            case AnalyticsEventType.VIEW:
              pStat.views = (pStat.views || 0) + 1;
              break;
            case AnalyticsEventType.ADD_TO_CART:
              pStat.addToCarts = (pStat.addToCarts || 0) + 1;
              break;
            case AnalyticsEventType.LIKE:
              pStat.likes = (pStat.likes || 0) + 1;
              break;
            case AnalyticsEventType.PURCHASE:
              pStat.purchases = (pStat.purchases || 0) + 1;
              pStat.revenue =
                Number(pStat.revenue || 0) + Number(event.value || 0);
              break;
          }
        }
      }

      if (event.storeId) {
        const sStat = storeStats[event.storeId]?.[dateString];
        if (sStat) {
          switch (event.eventType) {
            case AnalyticsEventType.VIEW:
              sStat.views = (sStat.views || 0) + 1;
              break;
            case AnalyticsEventType.ADD_TO_CART:
              sStat.addToCarts = (sStat.addToCarts || 0) + 1;
              break;
            case AnalyticsEventType.LIKE:
              sStat.likes = (sStat.likes || 0) + 1;
              break;
            case AnalyticsEventType.PURCHASE:
              sStat.purchases = (sStat.purchases || 0) + 1;
              sStat.revenue =
                Number(sStat.revenue || 0) + Number(event.value || 0);
              break;
            case AnalyticsEventType.CHECKOUT:
              sStat.checkouts = (sStat.checkouts || 0) + 1;
              break;
          }
        }
      }
    }

    const allProductStats = Object.values(productStats).flatMap((daily) =>
      Object.values(daily)
    );
    const allStoreStats = Object.values(storeStats).flatMap((daily) =>
      Object.values(daily)
    );

    await this.productDailyStatsRepository.save(allProductStats, {
      chunk: 500,
    });
    await this.storeDailyStatsRepository.save(allStoreStats, { chunk: 500 });
  }

  private async seedAnalyticsEvents(
    orders: Order[],
    products: Product[],
    users: User[]
  ): Promise<AnalyticsEvent[]> {
    const events: AnalyticsEvent[] = [];

    for (const order of orders) {
      const orderTime = order.createdAt as Date;
      const checkoutTime = new Date(orderTime.getTime() - 1000 * 60 * 2);

      if (order.status !== OrderStatus.CANCELLED) {
        events.push(
          this.analyticsEventRepository.create({
            storeId: order.storeId,
            userId: order.userId,
            eventType: AnalyticsEventType.CHECKOUT,
            invokedOn: 'store',
            createdAt: checkoutTime,
          })
        );
      }

      for (const item of order.items) {
        if (item.product?.id) {
          const addToCartTime = new Date(
            checkoutTime.getTime() - 1000 * 60 * 5
          );
          const viewTime = new Date(addToCartTime.getTime() - 1000 * 30);

          events.push(
            this.analyticsEventRepository.create({
              storeId: order.storeId,
              productId: item.product.id,
              userId: order.userId,
              eventType: AnalyticsEventType.VIEW,
              invokedOn: 'product',
              createdAt: viewTime,
            })
          );

          events.push(
            this.analyticsEventRepository.create({
              storeId: order.storeId,
              productId: item.product.id,
              userId: order.userId,
              eventType: AnalyticsEventType.ADD_TO_CART,
              invokedOn: 'product',
              createdAt: addToCartTime,
            })
          );

          if (order.status === OrderStatus.SHIPPED) {
            events.push(
              this.analyticsEventRepository.create({
                storeId: order.storeId,
                productId: item.product.id,
                userId: order.userId,
                eventType: AnalyticsEventType.PURCHASE,
                invokedOn: 'product',
                value: Number(item.lineTotal),
                createdAt: orderTime,
              })
            );
          }
        }
      }
    }

    for (let i = 0; i < 1500; i++) {
      const product = faker.helpers.arrayElement(products);
      const user = faker.helpers.arrayElement(users);
      const eventTime = faker.date.recent({ days: 90 });

      events.push(
        this.analyticsEventRepository.create({
          storeId: product.storeId,
          productId: product.id,
          userId: user.id,
          eventType: AnalyticsEventType.VIEW,
          invokedOn: 'product',
          createdAt: eventTime,
        })
      );

      if (faker.number.int({ min: 1, max: 4 }) === 1) {
        events.push(
          this.analyticsEventRepository.create({
            storeId: product.storeId,
            productId: product.id,
            userId: user.id,
            eventType: AnalyticsEventType.ADD_TO_CART,
            invokedOn: 'product',
            createdAt: new Date(eventTime.getTime() + 1000 * 30),
          })
        );
      }
    }

    for (let i = 0; i < 500; i++) {
      const product = faker.helpers.arrayElement(products);
      const user = faker.helpers.arrayElement(users);
      events.push(
        this.analyticsEventRepository.create({
          storeId: product.storeId,
          productId: product.id,
          userId: user.id,
          eventType: AnalyticsEventType.LIKE,
          invokedOn: 'product',
          createdAt: faker.date.recent({ days: 90 }),
        })
      );
    }

    return this.analyticsEventRepository.save(events, { chunk: 1000 });
  }
}
