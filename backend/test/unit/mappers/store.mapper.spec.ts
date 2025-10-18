import { StoreMapper } from 'src/modules/store/store.mapper';
import { Store } from 'src/entities/store/store.entity';
import { StoreDto } from 'src/modules/store/dto/store.dto';
import { User } from 'src/entities/user/user.entity';

describe('StoreMapper', () => {
  let mapper: StoreMapper;

  beforeEach(() => {
    mapper = new StoreMapper();
  });

  const createMockStore = (overrides?: Partial<Store>): Store =>
    ({
      id: 's1',
      name: 'Test Store',
      description: 'Test Description',
      owner: { id: 'u1', email: 'owner@test.com' } as User,
      productCount: 50,
      followerCount: 200,
      totalRevenue: 10000,
      orderCount: 100,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
      products: [],
      orders: [],
      carts: [],
      newsPosts: [],
      aiLogs: [],
      storeRoles: [],
      ...overrides,
    }) as Store;

  describe('toDto', () => {
    it('should map entity to full DTO', () => {
      const store = createMockStore();

      const result = mapper.toDto(store);

      expect(result).toEqual({
        id: 's1',
        name: 'Test Store',
        description: 'Test Description',
        owner: store.owner,
        productCount: 50,
        followerCount: 200,
        totalRevenue: 10000,
        orderCount: 100,
        createdAt: store.createdAt,
        updatedAt: store.updatedAt,
        products: [],
        orders: [],
        carts: [],
        newsPosts: [],
        aiLogs: [],
        storeRoles: [],
      });
    });

    it('should include all relations when loaded', () => {
      const store = createMockStore({
        products: [{ id: 'p1' }] as any,
        orders: [{ id: 'o1' }] as any,
      });

      const result = mapper.toDto(store);

      expect(result.products).toHaveLength(1);
      expect(result.orders).toHaveLength(1);
    });
  });

  describe('toEntity', () => {
    it('should map DTO to entity', () => {
      const dto: StoreDto = {
        name: 'New Store',
        description: 'New Description',
        owner: { id: 'u1' } as User,
      } as StoreDto;

      const result = mapper.toEntity(dto);

      expect(result.name).toBe('New Store');
      expect(result.description).toBe('New Description');
      expect(result.owner).toEqual(dto.owner);
    });

    it('should preserve id if provided', () => {
      const dto: StoreDto = {
        id: 'existing-id',
        name: 'Store',
      } as StoreDto;

      const result = mapper.toEntity(dto);

      expect(result.id).toBe('existing-id');
    });

    it('should preserve cached values if provided', () => {
      const dto: StoreDto = {
        name: 'Store',
        productCount: 10,
        followerCount: 50,
        totalRevenue: 5000,
        orderCount: 25,
      } as StoreDto;

      const result = mapper.toEntity(dto);

      expect(result.productCount).toBe(10);
      expect(result.followerCount).toBe(50);
      expect(result.totalRevenue).toBe(5000);
      expect(result.orderCount).toBe(25);
    });
  });

  describe('toListDto', () => {
    it('should map entity to lightweight list DTO', () => {
      const store = createMockStore();

      const result = mapper.toListDto(store);

      expect(result).toEqual({
        id: 's1',
        name: 'Test Store',
        description: 'Test Description',
        productCount: 50,
        followerCount: 200,
        totalRevenue: 10000,
        orderCount: 100,
        createdAt: store.createdAt,
        updatedAt: store.updatedAt,
      });
    });

    it('should handle null values gracefully', () => {
      const store = createMockStore({
        productCount: null as any,
        followerCount: null as any,
        totalRevenue: null as any,
        orderCount: null as any,
      });

      const result = mapper.toListDto(store);

      expect(result.productCount).toBe(0);
      expect(result.followerCount).toBe(0);
      expect(result.totalRevenue).toBe(0);
      expect(result.orderCount).toBe(0);
    });
  });

  describe('toStatsDto', () => {
    it('should map entity to stats DTO with calculated fields', () => {
      const store = createMockStore({
        totalRevenue: 10000,
        orderCount: 100,
      });

      const result = mapper.toStatsDto(store);

      expect(result).toEqual({
        id: 's1',
        name: 'Test Store',
        productCount: 50,
        followerCount: 200,
        totalRevenue: 10000,
        orderCount: 100,
        averageOrderValue: 100, // 10000 / 100
      });
    });

    it('should handle zero orders for average calculation', () => {
      const store = createMockStore({
        orderCount: 0,
        totalRevenue: 5000,
      });

      const result = mapper.toStatsDto(store);

      expect(result.averageOrderValue).toBe(0);
    });

    it('should round average order value to 2 decimals', () => {
      const store = createMockStore({
        totalRevenue: 1000,
        orderCount: 3,
      });

      const result = mapper.toStatsDto(store);

      expect(result.averageOrderValue).toBe(333.33); // 1000 / 3 = 333.333...
    });

    it('should handle string totalRevenue', () => {
      const store = createMockStore({
        totalRevenue: '10000.50' as any,
        orderCount: 100,
      });

      const result = mapper.toStatsDto(store);

      expect(result.averageOrderValue).toBe(100.01);
    });

    it('should handle null values', () => {
      const store = createMockStore({
        productCount: null as any,
        followerCount: null as any,
        totalRevenue: null as any,
        orderCount: null as any,
      });

      const result = mapper.toStatsDto(store);

      expect(result.productCount).toBe(0);
      expect(result.followerCount).toBe(0);
      expect(result.totalRevenue).toBe(0);
      expect(result.orderCount).toBe(0);
      expect(result.averageOrderValue).toBe(0);
    });
  });
});
