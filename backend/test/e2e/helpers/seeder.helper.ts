import { DataSource } from 'typeorm';
import { Store } from 'src/entities/store/store.entity';
import { Product } from 'src/entities/store/product/product.entity';
import { User } from 'src/entities/user/user.entity';
import { Category } from 'src/entities/store/product/category.entity';
import { ProductVariant } from 'src/entities/store/product/variant.entity';
import { Order } from 'src/entities/store/product/order.entity';
import { OrderItem } from 'src/entities/store/product/order-item.entity';
import { Inventory } from 'src/entities/store/product/inventory.entity';
import { OrderStatus } from 'src/common/enums/order-status.enum';

export class SeederHelper {
  constructor(private dataSource: DataSource) {}

  /**
   * Seed a store with owner
   */
  async seedStore(owner: User, storeData?: Partial<Store>): Promise<Store> {
    const storeRepo = this.dataSource.getRepository(Store);

    const store = storeRepo.create({
      name: `Test Store ${Date.now()}`,
      description: 'A test store',
      owner,
      productCount: 0,
      followerCount: 0,
      totalRevenue: 0,
      orderCount: 0,
      ...storeData,
    });

    return storeRepo.save(store);
  }
  /**
   * Seed a single product with custom data
   */
  async seedProduct(store: any, productData?: Partial<any>): Promise<any> {
    const productRepo = this.dataSource.getRepository('Product');

    const product = productRepo.create({
      name:
        productData?.name ||
        `Product ${Math.random().toString(36).substring(7)}`,
      description: productData?.description || 'Test product description',
      price: productData?.price || Math.floor(Math.random() * 100) + 10,
      storeId: store.id,
      status: productData?.status || 'active',
      ...productData,
    });

    return await productRepo.save(product);
  }

  /**
   * Seed products for a store
   */
  async seedProducts(store: Store, count: number = 5): Promise<Product[]> {
    const productRepo = this.dataSource.getRepository(Product);

    const products: Product[] = [];

    for (let i = 0; i < count; i++) {
      const product = productRepo.create({
        name: `Product ${i + 1}`,
        description: `Description for product ${i + 1}`,
        store,
        viewCount: Math.floor(Math.random() * 1000),
        totalSales: Math.floor(Math.random() * 100),
        likeCount: Math.floor(Math.random() * 50),
        reviewCount: Math.floor(Math.random() * 20),
        averageRating: parseFloat((Math.random() * 5).toFixed(2)),
      });

      products.push(await productRepo.save(product));
    }

    return products;
  }

  /**
   * Seed categories
   */
  async seedCategories(count: number = 3): Promise<Category[]> {
    const categoryRepo = this.dataSource.getRepository(Category);

    const categories: Category[] = [];

    for (let i = 0; i < count; i++) {
      const category = categoryRepo.create({
        name: `Category ${i + 1}`,
        description: `Description for category ${i + 1}`,
      });

      categories.push(await categoryRepo.save(category));
    }

    return categories;
  }

  /**
   * Seed product variants with inventory
   */
  async seedVariants(
    product: Product,
    count: number = 3
  ): Promise<ProductVariant[]> {
    const variantRepo = this.dataSource.getRepository(ProductVariant);
    const inventoryRepo = this.dataSource.getRepository(Inventory);

    const variants: ProductVariant[] = [];

    for (let i = 0; i < count; i++) {
      const variant = variantRepo.create({
        product,
        sku: `SKU-${Date.now()}-${i}`,
        price: parseFloat((Math.random() * 100 + 10).toFixed(2)),
        attributes: {
          size: ['S', 'M', 'L'][i % 3],
          color: ['Red', 'Blue', 'Green'][i % 3],
        },
      });

      const savedVariant = await variantRepo.save(variant);

      // Create inventory for this variant
      const inventory = inventoryRepo.create({
        variant: savedVariant,
        store: product.store,
        quantity: Math.floor(Math.random() * 100 + 50), // Random stock between 50-150
        lastRestockedAt: new Date(),
      });

      await inventoryRepo.save(inventory);

      variants.push(savedVariant);
    }

    return variants;
  }

  /**
   * Seed orders for a user in a store
   */
  async seedOrders(
    store: Store,
    user: User,
    count: number = 3,
    options?: {
      status?: OrderStatus;
      includeItems?: boolean;
      itemsPerOrder?: number;
    }
  ): Promise<Order[]> {
    const orderRepo = this.dataSource.getRepository(Order);
    const orderItemRepo = this.dataSource.getRepository(OrderItem);

    const {
      status = OrderStatus.PENDING,
      includeItems = true,
      itemsPerOrder = 2,
    } = options || {};

    const orders: Order[] = [];

    // Get or create products with variants for the store
    let products = await this.dataSource.getRepository(Product).find({
      where: { store: { id: store.id } },
      relations: ['store'],
      take: 5,
    });

    if (products.length === 0) {
      products = await this.seedProducts(store, 5);
    }

    // Ensure products have variants with inventory
    for (const product of products) {
      const variants = await this.dataSource
        .getRepository(ProductVariant)
        .find({
          where: { product: { id: product.id } },
          relations: ['inventory'],
        });

      if (variants.length === 0) {
        await this.seedVariants(product, 3);
      }
    }

    for (let i = 0; i < count; i++) {
      const order = orderRepo.create({
        user,
        store,
        status,
        totalAmount: 0,
        shipping: {
          firstName: 'John',
          lastName: 'Doe',
          address: `${123 + i} Main St`,
          city: 'New York',
          postalCode: '10001',
          country: 'US',
          phone: '555-0123',
          email: 'john.doe@example.com',
        },
        billing: {
          firstName: 'John',
          lastName: 'Doe',
          address: `${123 + i} Main St`,
          city: 'New York',
          postalCode: '10001',
          country: 'US',
          phone: '555-0123',
          email: 'john.doe@example.com',
        },
      } as unknown as Order);

      const savedOrder = (await orderRepo.save(order)) as unknown as Order;

      // Add order items if requested
      if (includeItems) {
        let orderTotal = 0;

        for (let j = 0; j < itemsPerOrder; j++) {
          const product = products[j % products.length];
          const variants = await this.dataSource
            .getRepository(ProductVariant)
            .find({ where: { product: { id: product.id } } });

          if (variants.length === 0) continue;

          const variant = variants[0];
          const quantity = Math.floor(Math.random() * 3) + 1;
          const unitPrice = parseFloat(variant.price.toString());
          const lineTotal = unitPrice * quantity;

          const orderItem = orderItemRepo.create({
            order: savedOrder,
            variant,
            product,
            productName: product.name,
            sku: variant.sku,
            unitPrice,
            quantity,
            lineTotal,
          });

          await orderItemRepo.save(orderItem);
          orderTotal += lineTotal;
        }

        // Update order total
        savedOrder.totalAmount = orderTotal;
        await orderRepo.save(savedOrder);
      }

      orders.push(savedOrder);
    }

    // Reload orders with items
    const orderIds = orders.map((o) => o.id);
    return orderRepo.find({
      where: orderIds.length > 0 ? (orderIds.map((id) => ({ id })) as any) : {},
      relations: ['items', 'items.variant', 'items.product', 'user', 'store'],
    });
  }

  /**
   * Seed a single order with specific items
   */
  async seedOrder(
    store: Store,
    user: User,
    items: Array<{
      variant: ProductVariant;
      product: Product;
      quantity: number;
    }>,
    options?: {
      status?: OrderStatus;
      shipping?: any;
      billing?: any;
    }
  ): Promise<Order | null> {
    const orderRepo = this.dataSource.getRepository(Order);
    const orderItemRepo = this.dataSource.getRepository(OrderItem);

    const { status = OrderStatus.PENDING, shipping, billing } = options || {};

    const order = orderRepo.create({
      user,
      store,
      status,
      totalAmount: 0,
      shipping: shipping || {
        firstName: 'John',
        lastName: 'Doe',
        address: '123 Main St',
        city: 'New York',
        postalCode: '10001',
        country: 'US',
        phone: '555-0123',
        email: 'john.doe@example.com',
      },
      billing: billing || {
        firstName: 'John',
        lastName: 'Doe',
        address: '123 Main St',
        city: 'New York',
        postalCode: '10001',
        country: 'US',
        phone: '555-0123',
        email: 'john.doe@example.com',
      },
    });

    const savedOrder = await orderRepo.save(order);

    let orderTotal = 0;

    for (const item of items) {
      const unitPrice = parseFloat(item.variant.price.toString());
      const lineTotal = unitPrice * item.quantity;

      const orderItem = orderItemRepo.create({
        order: savedOrder,
        variant: item.variant,
        product: item.product,
        productName: item.product.name,
        sku: item.variant.sku,
        unitPrice,
        quantity: item.quantity,
        lineTotal,
      });

      await orderItemRepo.save(orderItem);
      orderTotal += lineTotal;
    }

    // Update order total
    savedOrder.totalAmount = orderTotal;
    await orderRepo.save(savedOrder);

    // Reload with relations
    return orderRepo.findOne({
      where: { id: savedOrder.id },
      relations: ['items', 'items.variant', 'items.product', 'user', 'store'],
    });
  }

  /**
   * Seed orders with different statuses
   */
  async seedOrdersWithStatuses(
    store: Store,
    user: User
  ): Promise<Record<OrderStatus, Order>> {
    const statuses = [
      OrderStatus.PENDING,
      OrderStatus.PAID,
      OrderStatus.SHIPPED,
      OrderStatus.DELIVERED,
      OrderStatus.CANCELLED,
      OrderStatus.RETURNED,
    ];

    const orders: Record<string, Order> = {};

    for (const status of statuses) {
      const [order] = await this.seedOrders(store, user, 1, {
        status,
        includeItems: true,
        itemsPerOrder: 2,
      });

      orders[status] = order;
    }

    return orders as Record<OrderStatus, Order>;
  }

  /**
   * Get inventory for a variant
   */
  async getInventory(
    variant: ProductVariant,
    store: Store
  ): Promise<Inventory | null> {
    const inventoryRepo = this.dataSource.getRepository(Inventory);
    return inventoryRepo.findOne({
      where: {
        variant: { id: variant.id },
        store: { id: store.id },
      },
    });
  }

  /**
   * Update inventory quantity
   */
  async updateInventory(
    variant: ProductVariant,
    store: Store,
    quantity: number
  ): Promise<Inventory> {
    const inventoryRepo = this.dataSource.getRepository(Inventory);

    let inventory = await this.getInventory(variant, store);

    if (!inventory) {
      inventory = inventoryRepo.create({
        variant,
        store,
        quantity,
        lastRestockedAt: new Date(),
      });
    } else {
      inventory.quantity = quantity;
      inventory.lastRestockedAt = new Date();
    }

    return inventoryRepo.save(inventory);
  }

  /**
   * Seed complete store with products and variants
   */
  async seedCompleteStore(owner: User): Promise<{
    store: Store;
    products: Product[];
    categories: Category[];
  }> {
    const store = await this.seedStore(owner);
    const products = await this.seedProducts(store, 5);
    const categories = await this.seedCategories(3);

    // Add variants to products (this also creates inventory)
    for (const product of products) {
      await this.seedVariants(product, 2);
    }

    // Link categories to products
    const productRepo = this.dataSource.getRepository(Product);
    for (const product of products) {
      product.categories = [
        categories[Math.floor(Math.random() * categories.length)],
      ];
      await productRepo.save(product);
    }

    return { store, products, categories };
  }

  /**
   * Seed complete store with products, variants, and orders
   */
  async seedCompleteStoreWithOrders(
    owner: User,
    customer: User
  ): Promise<{
    store: Store;
    products: Product[];
    categories: Category[];
    orders: Order[];
  }> {
    const { store, products, categories } = await this.seedCompleteStore(owner);

    // Create orders for the customer
    const orders = await this.seedOrders(store, customer, 5, {
      includeItems: true,
      itemsPerOrder: 3,
    });

    return { store, products, categories, orders };
  }

  /**
   * Clean up all seeded data
   */
  async cleanup(): Promise<void> {
    // Order matters due to foreign key constraints
    const entities = [
      'OrderItem',
      'Order',
      'Inventory',
      'ProductVariant',
      'Product',
      'Category',
      'Store',
      'Like',
      'Review',
      'NewsPost',
      'CartItem',
      'ShoppingCart',
      'AnalyticsEvent',
    ];

    for (const entity of entities) {
      try {
        const repo = this.dataSource.getRepository(entity);
        await repo.clear();
      } catch (error) {
        // Entity might not exist, continue
        console.warn(`Could not clear ${entity}:`, error.message);
      }
    }
  }
}
