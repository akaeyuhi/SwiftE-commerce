import { Test, TestingModule } from '@nestjs/testing';
import { CartItemService } from 'src/modules/store/cart/cart-item/cart-item.service';
import { CartItemRepository } from 'src/modules/store/cart/cart-item/cart-item.repository';
import { CartItem } from 'src/entities/store/cart/cart-item.entity';
import { CartItemDto } from 'src/modules/store/cart/cart-item/dto/cart-item.dto';
import {
  createMock,
  createRepositoryMock,
  MockedMethods,
} from 'test/unit/utils/helpers';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ShoppingCart } from 'src/entities/store/cart/cart.entity';
import { ProductVariant } from 'src/entities/store/product/variant.entity';
import { EntityManager } from 'typeorm';

describe('CartItemService', () => {
  let service: CartItemService;
  let repo: Partial<MockedMethods<CartItemRepository>>;

  const mockCartItem: CartItem = {
    id: 'item1',
    cart: { id: 'cart1' } as ShoppingCart,
    variant: { id: 'variant1' } as ProductVariant,
    quantity: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as CartItem;

  beforeEach(async () => {
    repo = createRepositoryMock<CartItemRepository>([
      'findByCartAndVariant',
      'findWithRelations',
      'findByCart',
      'createEntity',
    ]);

    const entityRepoMock = createMock(['create', 'save', 'delete']);
    Object.assign(repo, {
      manager: createMock<EntityManager>(['getRepository']),
    });
    (repo.manager?.getRepository as jest.Mock).mockReturnValue(entityRepoMock);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartItemService,
        { provide: CartItemRepository, useValue: repo },
      ],
    }).compile();

    service = module.get<CartItemService>(CartItemService);
    jest.clearAllMocks();
  });

  describe('createWithCartAndVariant', () => {
    it('creates cart item with valid data', async () => {
      repo.createEntity!.mockResolvedValue(mockCartItem);

      const dto: CartItemDto = {
        cartId: 'cart1',
        variantId: 'variant1',
        quantity: 2,
      };
      const result = await service.createWithCartAndVariant(dto);

      expect(result).toEqual(mockCartItem);
      expect(repo.createEntity).toHaveBeenCalledWith({
        cart: { id: 'cart1' },
        variant: { id: 'variant1' },
        quantity: 2,
      });
    });

    it('throws when cartId missing', async () => {
      const dto = { variantId: 'variant1', quantity: 2 } as any;
      await expect(service.createWithCartAndVariant(dto)).rejects.toThrow(
        BadRequestException
      );
    });

    it('throws when quantity invalid', async () => {
      const dto = { cartId: 'cart1', variantId: 'variant1', quantity: 0 };
      await expect(service.createWithCartAndVariant(dto)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('addOrIncrement', () => {
    const entityRepo = {
      create: jest.fn(),
      save: jest.fn(),
    };

    beforeEach(() => {
      (repo as any).manager.getRepository.mockReturnValue(entityRepo);
    });

    it('creates new item when not exists', async () => {
      repo.findByCartAndVariant!.mockResolvedValue(null);
      entityRepo.create.mockReturnValue(mockCartItem);
      entityRepo.save.mockResolvedValue(mockCartItem);

      const result = await service.addOrIncrement({
        cartId: 'cart1',
        variantId: 'variant1',
        quantity: 3,
      });

      expect(repo.findByCartAndVariant).toHaveBeenCalledWith(
        'cart1',
        'variant1'
      );
      expect(entityRepo.create).toHaveBeenCalledWith({
        cart: { id: 'cart1' },
        variant: { id: 'variant1' },
        quantity: 3,
      });
      expect(result).toEqual(mockCartItem);
    });

    it('increments existing item', async () => {
      const existing = { ...mockCartItem, quantity: 2 };
      repo.findByCartAndVariant!.mockResolvedValue(existing as any);
      entityRepo.save.mockResolvedValue({ ...existing, quantity: 5 });

      const result = await service.addOrIncrement({
        cartId: 'cart1',
        variantId: 'variant1',
        quantity: 3,
      });

      expect(existing.quantity).toBe(5); // 2 + 3
      expect(entityRepo.save).toHaveBeenCalledWith(existing);
      expect(result.quantity).toBe(5);
    });

    it('throws for non-positive quantity', async () => {
      await expect(
        service.addOrIncrement({
          cartId: 'cart1',
          variantId: 'variant1',
          quantity: 0,
        })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateQuantity', () => {
    const entityRepo = {
      save: jest.fn(),
      delete: jest.fn(),
    };

    beforeEach(() => {
      (repo as any).manager.getRepository.mockReturnValue(entityRepo);
    });

    it('updates item quantity', async () => {
      const item = { ...mockCartItem };
      repo.findWithRelations!.mockResolvedValue(item as any);
      entityRepo.save.mockResolvedValue({ ...item, quantity: 5 });

      const result = await service.updateQuantity('item1', 5);

      expect(item.quantity).toBe(5);
      expect(entityRepo.save).toHaveBeenCalledWith(item);
      expect(result.quantity).toBe(5);
    });

    it('deletes item when quantity is 0', async () => {
      const item = { ...mockCartItem };
      repo.findWithRelations!.mockResolvedValue(item as any);
      entityRepo.delete.mockResolvedValue({ affected: 1 });

      const result = await service.updateQuantity('item1', 0);

      expect(entityRepo.delete).toHaveBeenCalledWith('item1');
      expect(result.quantity).toBe(0);
    });

    it('throws when item not found', async () => {
      repo.findWithRelations!.mockResolvedValue(null);
      await expect(service.updateQuantity('missing', 5)).rejects.toThrow(
        NotFoundException
      );
    });

    it('throws for negative quantity', async () => {
      await expect(service.updateQuantity('item1', -1)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('adjustQuantity', () => {
    const entityRepo = { save: jest.fn() };

    beforeEach(() => {
      (repo as any).manager.getRepository.mockReturnValue(entityRepo);
    });

    it('adjusts quantity by delta', async () => {
      const item = { ...mockCartItem, quantity: 3 };
      repo.findWithRelations!.mockResolvedValue(item as any);
      entityRepo.save.mockResolvedValue({ ...item, quantity: 5 });

      const result = await service.adjustQuantity('item1', 2);

      expect(item.quantity).toBe(5); // 3 + 2
      expect(result.quantity).toBe(5);
    });

    it('throws when delta is zero', async () => {
      await expect(service.adjustQuantity('item1', 0)).rejects.toThrow(
        BadRequestException
      );
    });

    it('throws when result would be negative', async () => {
      const item = { ...mockCartItem, quantity: 1 };
      repo.findWithRelations!.mockResolvedValue(item as any);

      await expect(service.adjustQuantity('item1', -2)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('findByCart', () => {
    it('delegates to repo.findByCart', async () => {
      const items = [mockCartItem];
      repo.findByCart!.mockResolvedValue(items);

      const result = await service.findByCart('cart1');

      expect(repo.findByCart).toHaveBeenCalledWith('cart1');
      expect(result).toEqual(items);
    });
  });
});
