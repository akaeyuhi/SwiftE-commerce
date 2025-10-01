import { Test, TestingModule } from '@nestjs/testing';
import { CartService } from 'src/modules/store/cart/cart.service';
import { CartRepository } from 'src/modules/store/cart/cart.repository';
import { CartItemService } from 'src/modules/store/cart/cart-item/cart-item.service';
import { ShoppingCart } from 'src/entities/store/cart/cart.entity';
import { CartItem } from 'src/entities/store/cart/cart-item.entity';
import { BadRequestException } from '@nestjs/common';
import {
  createRepositoryMock,
  createServiceMock,
  MockedMethods,
} from 'test/unit/utils/helpers';

describe('CartService', () => {
  let service: CartService;
  let repo: Partial<MockedMethods<CartRepository>>;
  let cartItemService: Partial<MockedMethods<CartItemService>>;

  beforeEach(async () => {
    repo = createRepositoryMock<CartRepository>([
      'findByUserAndStore',
      'createEntity',
      'findAllByUser',
      'findWithItems',
    ]);

    cartItemService = createServiceMock<CartItemService>([
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
      const existing: ShoppingCart = { id: 'c1' } as ShoppingCart;
      repo.findByUserAndStore!.mockResolvedValue(existing);
      const res = await service.getOrCreateCart('u1', 's1');
      expect(repo.findByUserAndStore).toHaveBeenCalledWith('u1', 's1');
      expect(res).toEqual(existing);
    });

    it('creates a new cart when none exists', async () => {
      repo.findByUserAndStore!.mockResolvedValue(null);
      const created = { id: 'new' } as ShoppingCart;
      // createEntity should be called with partial user & store
      repo.createEntity!.mockResolvedValue(created);

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
      const cart = { id: 'c1' } as ShoppingCart;
      repo.findByUserAndStore!.mockResolvedValue(cart);
      const res = await service.getCartByUserAndStore('u1', 's1');
      expect(repo.findByUserAndStore).toHaveBeenCalledWith('u1', 's1');
      expect(res).toBe(cart);
    });
  });

  // describe('addItemToUserCart', () => {
  //   it('throws for non-positive quantity', async () => {
  //     await expect(
  //       service.addItemToUserCart('u1', 's1', 'v1', 0)
  //     ).rejects.toThrow(BadRequestException);
  //   });
  //
  //   it('creates a cart if missing then delegates addOrIncrement', async () => {
  //     const cart = { id: 'cart1' } as ShoppingCart;
  //     jest.spyOn(service, 'getOrCreateCart').mockResolvedValue(cart);
  //     const returned = { id: 'i1', quantity: 2 } as CartItem;
  //     cartItemService.addOrIncrement!.mockResolvedValue(returned);
  //
  //     const res = await service.addItemToUserCart('u1', 's1', 'variant-1', 2);
  //     expect(service.getOrCreateCart).toHaveBeenCalledWith('u1', 's1');
  //     expect(cartItemService.addOrIncrement).toHaveBeenCalledWith(
  //       cart.id,
  //       'variant-1',
  //       2
  //     );
  //     expect(res).toEqual(returned);
  //   });
  // });

  describe('updateItemQuantity & removeItem', () => {
    it('updateItemQuantity delegates to cartItemService.updateQuantity', async () => {
      const updated = { id: 'i1', quantity: 5 } as CartItem;
      cartItemService.updateQuantity!.mockResolvedValue(updated);
      const res = await service.updateItemQuantity('i1', 5);
      expect(cartItemService.updateQuantity).toHaveBeenCalledWith('i1', 5);
      expect(res).toEqual(updated);
    });

    it('removeItem delegates to cartItemService.remove', async () => {
      cartItemService.remove!.mockResolvedValue(undefined);
      await service.removeItem('i1');
      expect(cartItemService.remove).toHaveBeenCalledWith('i1');
    });
  });

  describe('clearCart', () => {
    it('fetches items and removes them all', async () => {
      const items = [{ id: 'a' }, { id: 'b' }] as CartItem[];
      cartItemService.findByCart!.mockResolvedValue(items);
      cartItemService.remove!.mockResolvedValue(undefined);

      await service.clearCart('cart1');
      expect(cartItemService.findByCart).toHaveBeenCalledWith('cart1');
      expect(cartItemService.remove).toHaveBeenCalledTimes(2);
      expect(cartItemService.remove).toHaveBeenCalledWith('a');
      expect(cartItemService.remove).toHaveBeenCalledWith('b');
    });
  });

  describe('getUserMergedCarts', () => {
    it('delegates to repo.findAllByUser', async () => {
      const carts = [{ id: 'c1' }] as ShoppingCart[];
      repo.findAllByUser!.mockResolvedValue(carts);
      const res = await service.getUserMergedCarts('u1');
      expect(repo.findAllByUser).toHaveBeenCalledWith('u1');
      expect(res).toEqual(carts);
    });
  });
});
