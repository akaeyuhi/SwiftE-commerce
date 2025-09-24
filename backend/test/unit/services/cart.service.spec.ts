import { Test, TestingModule } from '@nestjs/testing';
import { CartService } from 'src/modules/store/cart/cart.service';
import { CartRepository } from 'src/modules/store/cart/cart.repository';
import { CartItemService } from 'src/modules/store/cart/cart-item/cart-item.service';
import { ShoppingCart } from 'src/entities/store/cart/cart.entity';
import { CartItem } from 'src/entities/store/cart/cart-item.entity';
import { BadRequestException } from '@nestjs/common';
import { mockRepository, mockService } from 'test/unit/utils/test-helpers';

describe('CartService', () => {
  let service: CartService;
  let repo: jest.Mocked<Partial<CartRepository>>;
  let cartItemService: jest.Mocked<Partial<CartItemService>>;

  beforeEach(async () => {
    repo = mockRepository<CartRepository>([
      'findByUserAndStore',
      'createEntity',
      'findAllByUser',
      'findWithItems',
    ]);

    cartItemService = mockService<CartItemService>([
      'addOrIncrement',
      'updateQuantity',
      'remove',
      'findByCart',
    ]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: CartRepository, useValue: repo },
        { provide: CartItemService, useValue: cartItemService },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrCreateCart', () => {
    it('returns existing cart when repo has it', async () => {
      const existing: Partial<ShoppingCart> = { id: 'c1' };
      (repo.findByUserAndStore as jest.Mock).mockResolvedValue(existing as any);
      const res = await service.getOrCreateCart('u1', 's1');
      expect(repo.findByUserAndStore).toHaveBeenCalledWith('u1', 's1');
      expect(res).toEqual(existing);
    });

    it('creates a new cart when none exists', async () => {
      (repo.findByUserAndStore as jest.Mock).mockResolvedValue(null);
      const created: Partial<ShoppingCart> = { id: 'new' };
      // createEntity should be called with partial user & store
      (repo.createEntity as jest.Mock).mockResolvedValue(created as any);

      const res = await service.getOrCreateCart('u1', 's1');
      expect(repo.findByUserAndStore).toHaveBeenCalledWith('u1', 's1');
      expect(repo.createEntity).toHaveBeenCalledWith({
        user: { id: 'u1' },
        store: { id: 's1' },
        items: [],
      });
      expect(res).toEqual(created);
    });
  });

  describe('getCartByUserAndStore', () => {
    it('delegates to repo.findByUserAndStore', async () => {
      const cart = { id: 'c1' } as any;
      (repo.findByUserAndStore as jest.Mock).mockResolvedValue(cart);
      const res = await service.getCartByUserAndStore('u1', 's1');
      expect(repo.findByUserAndStore).toHaveBeenCalledWith('u1', 's1');
      expect(res).toBe(cart);
    });
  });

  describe('addItemToUserCart', () => {
    it('throws for non-positive quantity', async () => {
      await expect(
        service.addItemToUserCart('u1', 's1', 'v1', 0)
      ).rejects.toThrow(BadRequestException);
    });

    it('creates a cart if missing then delegates addOrIncrement', async () => {
      const cart = { id: 'cart1' } as ShoppingCart;
      jest.spyOn(service as any, 'getOrCreateCart').mockResolvedValue(cart);
      const returned: Partial<CartItem> = { id: 'i1', quantity: 2 } as any;
      (cartItemService.addOrIncrement as jest.Mock).mockResolvedValue(
        returned as any
      );

      const res = await service.addItemToUserCart('u1', 's1', 'variant-1', 2);
      expect((service as any).getOrCreateCart).toHaveBeenCalledWith('u1', 's1');
      expect(cartItemService.addOrIncrement).toHaveBeenCalledWith(
        cart.id,
        'variant-1',
        2
      );
      expect(res).toEqual(returned);
    });
  });

  describe('updateItemQuantity & removeItem', () => {
    it('updateItemQuantity delegates to cartItemService.updateQuantity', async () => {
      const updated = { id: 'i1', quantity: 5 } as any;
      (cartItemService.updateQuantity as jest.Mock).mockResolvedValue(updated);
      const res = await service.updateItemQuantity('i1', 5);
      expect(cartItemService.updateQuantity).toHaveBeenCalledWith('i1', 5);
      expect(res).toEqual(updated);
    });

    it('removeItem delegates to cartItemService.remove', async () => {
      (cartItemService.remove as jest.Mock).mockResolvedValue(undefined);
      await service.removeItem('i1');
      expect(cartItemService.remove).toHaveBeenCalledWith('i1');
    });
  });

  describe('clearCart', () => {
    it('fetches items and removes them all', async () => {
      const items = [{ id: 'a' }, { id: 'b' }] as any[];
      (cartItemService.findByCart as jest.Mock).mockResolvedValue(items);
      (cartItemService.remove as jest.Mock).mockResolvedValue(undefined);

      await service.clearCart('cart1');
      expect(cartItemService.findByCart).toHaveBeenCalledWith('cart1');
      expect(cartItemService.remove).toHaveBeenCalledTimes(2);
      expect(cartItemService.remove).toHaveBeenCalledWith('a');
      expect(cartItemService.remove).toHaveBeenCalledWith('b');
    });
  });

  describe('getUserMergedCarts', () => {
    it('delegates to repo.findAllByUser', async () => {
      const carts = [{ id: 'c1' }] as any;
      (repo.findAllByUser as jest.Mock).mockResolvedValue(carts as any);
      const res = await service.getUserMergedCarts('u1');
      expect(repo.findAllByUser).toHaveBeenCalledWith('u1');
      expect(res).toEqual(carts);
    });
  });
});
