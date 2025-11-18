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
    @InjectDataSource() private readonly dataSource: DataSource
  ) {}

  async seed() {
    console.log('Starting database seed...');

    // Clear existing data
    await this.clearDatabase();

    // Create users
    const users = await this.seedUsers(20);
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

    // Create reviews
    const reviews = await this.seedReviews(users, products);
    console.log(`🌱 Seeded ${reviews.length} reviews`);

    // Create news posts
    const newsPosts = await this.seedNewsPosts(users, stores);
    console.log(`🌱 Seeded ${newsPosts.length} news posts`);

    console.log('✅ Database seeding completed successfully!');
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

      // Assign a store admin
      const storeAdmin = faker.helpers.arrayElement(
        users.filter((u) => u.id !== store.ownerId)
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
            price: parseFloat(faker.commerce.price()),
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
            quantity: faker.number.int({ min: 0, max: 100 }),
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
    const orders: Order[] = [];
    for (let i = 0; i < 100; i++) {
      const user = faker.helpers.arrayElement(users);
      const store = faker.helpers.arrayElement(stores);
      const storeProducts = products.filter((p) => p.storeId === store.id);

      if (storeProducts.length === 0) continue;

      const orderItems: OrderItem[] = [];
      let totalAmount = 0;

      for (let j = 0; j < faker.number.int({ min: 1, max: 5 }); j++) {
        const product = faker.helpers.arrayElement(storeProducts);
        if (!product.variants || product.variants.length === 0) continue;
        const variant = faker.helpers.arrayElement(product.variants);
        const quantity = faker.number.int({ min: 1, max: 3 });
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

      const order = this.orderRepository.create({
        userId: user.id,
        storeId: store.id,
        status: faker.helpers.arrayElement(Object.values(OrderStatus)),
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

    for (let i = 0; i < 200; i++) {
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
      // Find users with roles in this store
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
}
