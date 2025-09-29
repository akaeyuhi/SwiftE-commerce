import { Test, TestingModule } from '@nestjs/testing';
import { CartItemService } from 'src/modules/store/cart/cart-item/cart-item.service';
import { CartItemRepository } from 'src/modules/store/cart/cart-item/cart-item.repository';
import { CartItem } from 'src/entities/store/cart/cart-item.entity';
import { CartItemDto } from 'src/modules/store/cart/cart-item/dto/cart-item.dto';
import {
  createRepositoryMock,
  MockedMethods,
  createMock,
} from '../utils/helpers';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';

describe('CartItemService', () => {
  let service: CartItemService;
  let cartItemRepo: Partial<MockedMethods<CartItemRepository>>;
  let entityManager: Partial<MockedMethods<EntityManager>>;
  let itemRepository: Partial<MockedMethods<Repository<CartItem>>>;

  const mockCartItem: CartItem = {
    id: 'item1',
    cart: { id: 'cart1' },
    variant: { id: 'variant1', name: 'Test Variant' },
    quantity: 2,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  } as unknown as CartItem;

  const mockCartItemDto: CartItemDto = {
    cartId: 'cart1',
    variantId: 'variant1',
    quantity: 2,
  } as CartItemDto;

  beforeEach(async () => {
    itemRepository = createMock<Repository<CartItem>>([
      'create',
      'save',
      'delete',
    ]);
    entityManager = createMock<EntityManager>(['getRepository']);
    entityManager.getRepository!.mockReturnValue(
      itemRepository as Repository<CartItem>
    );

    cartItemRepo = createRepositoryMock<CartItemRepository>([
      'findByCart',
      'findWithRelations',
      'findByCartAndVariant',
      'findAll',
      'findById',
      'createEntity',
      'updateEntity',
      'delete',
      'save',
    ]);

    // Mock the manager property
    Object.defineProperty(cartItemRepo, 'manager', {
      value: entityManager,
      configurable: true,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartItemService,
        { provide: CartItemRepository, useValue: cartItemRepo },
      ],
    }).compile();

    service = module.get<CartItemService>(CartItemService);
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should extend BaseService', () => {
      expect(service).toBeInstanceOf(CartItemService);
      expect(typeof service.create).toBe('function');
      expect(typeof service.findAll).toBe('function');
      expect(typeof service.findOne).toBe('function');
      expect(typeof service.update).toBe('function');
      expect(typeof service.remove).toBe('function');
    });
  });

  describe('createWithCartAndVariant', () => {
    it('should create cart item with valid data', async () => {
      cartItemRepo.createEntity!.mockResolvedValue(mockCartItem);

      const result = await service.createWithCartAndVariant(mockCartItemDto);

      expect(result).toEqual(mockCartItem);
      expect(cartItemRepo.createEntity).toHaveBeenCalledWith({
        cart: { id: 'cart1' },
        variant: { id: 'variant1' },
        quantity: 2,
      });
    });

    it('should throw BadRequestException when cartId missing', async () => {
      const invalidDto = {
        ...mockCartItemDto,
        cartId: undefined,
      } as unknown as CartItemDto;

      await expect(
        service.createWithCartAndVariant(invalidDto)
      ).rejects.toThrow(BadRequestException);
      expect(cartItemRepo.createEntity).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when variantId missing', async () => {
      const invalidDto = {
        ...mockCartItemDto,
        variantId: undefined,
      } as unknown as CartItemDto;

      await expect(
        service.createWithCartAndVariant(invalidDto)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when quantity is 0 or negative', async () => {
      const invalidQuantities = [0, -1, -5];

      for (const quantity of invalidQuantities) {
        const invalidDto = { ...mockCartItemDto, quantity };

        await expect(
          service.createWithCartAndVariant(invalidDto)
        ).rejects.toThrow(BadRequestException);
      }
    });

    it('should handle repository errors', async () => {
      const dbError = new Error('Database constraint violation');
      cartItemRepo.createEntity!.mockRejectedValue(dbError);

      await expect(
        service.createWithCartAndVariant(mockCartItemDto)
      ).rejects.toThrow(dbError);
    });
  });

  describe('addOrIncrement', () => {
    it('should create new item when not exists', async () => {
      const newItem = { ...mockCartItem, quantity: 3 } as CartItem;

      cartItemRepo.findByCartAndVariant!.mockResolvedValue(null);
      itemRepository.create!.mockReturnValue(newItem);
      itemRepository.save!.mockResolvedValue(newItem);

      const result = await service.addOrIncrement('cart1', 'variant1', 3);

      expect(result).toEqual(newItem);
      expect(cartItemRepo.findByCartAndVariant).toHaveBeenCalledWith(
        'cart1',
        'variant1'
      );
      expect(itemRepository.create).toHaveBeenCalledWith({
        cart: { id: 'cart1' },
        variant: { id: 'variant1' },
        quantity: 3,
      });
      expect(itemRepository.save).toHaveBeenCalledWith(newItem);
    });

    it('should increment existing item quantity', async () => {
      const existingItem = { ...mockCartItem, quantity: 2 } as CartItem;
      const incrementedItem = { ...mockCartItem, quantity: 5 } as CartItem;

      cartItemRepo.findByCartAndVariant!.mockResolvedValue(existingItem);
      itemRepository.save!.mockResolvedValue(incrementedItem);

      const result = await service.addOrIncrement('cart1', 'variant1', 3);

      expect(result).toEqual(incrementedItem);
      expect(existingItem.quantity).toBe(5); // 2 + 3
      expect(itemRepository.save).toHaveBeenCalledWith(existingItem);
    });

    it('should use default quantity of 1 when not provided', async () => {
      const newItem = { ...mockCartItem, quantity: 1 } as CartItem;

      cartItemRepo.findByCartAndVariant!.mockResolvedValue(null);
      itemRepository.create!.mockReturnValue(newItem);
      itemRepository.save!.mockResolvedValue(newItem);

      const result = await service.addOrIncrement('cart1', 'variant1');

      expect(result.quantity).toBe(1);
      expect(itemRepository.create).toHaveBeenCalledWith({
        cart: { id: 'cart1' },
        variant: { id: 'variant1' },
        quantity: 1,
      });
    });

    it('should throw BadRequestException for non-positive quantity', async () => {
      const invalidQuantities = [0, -1, -10];

      for (const quantity of invalidQuantities) {
        await expect(
          service.addOrIncrement('cart1', 'variant1', quantity)
        ).rejects.toThrow(BadRequestException);
      }
    });

    it('should handle null quantity on existing item', async () => {
      const existingItem = { ...mockCartItem, quantity: null } as any;
      const incrementedItem = { ...mockCartItem, quantity: 3 } as CartItem;

      cartItemRepo.findByCartAndVariant!.mockResolvedValue(existingItem);
      itemRepository.save!.mockResolvedValue(incrementedItem);

      await service.addOrIncrement('cart1', 'variant1', 3);

      expect(existingItem.quantity).toBe(3); // 0 + 3
    });
  });

  describe('updateQuantity', () => {
    it('should update item quantity', async () => {
      const updatedItem = { ...mockCartItem, quantity: 5 } as CartItem;

      cartItemRepo.findWithRelations!.mockResolvedValue(mockCartItem);
      itemRepository.save!.mockResolvedValue(updatedItem);

      const result = await service.updateQuantity('item1', 5);

      expect(result).toEqual(updatedItem);
      expect(mockCartItem.quantity).toBe(5);
      expect(itemRepository.save).toHaveBeenCalledWith(mockCartItem);
    });

    it('should remove item when quantity is 0', async () => {
      cartItemRepo.findWithRelations!.mockResolvedValue(mockCartItem);
      itemRepository.delete!.mockResolvedValue({ affected: 1, raw: {} } as any);

      const result = await service.updateQuantity('item1', 0);

      expect(result.quantity).toBe(0);
      expect(itemRepository.delete).toHaveBeenCalledWith('item1');
      expect(itemRepository.save).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when item not found', async () => {
      cartItemRepo.findWithRelations!.mockResolvedValue(null);

      await expect(service.updateQuantity('nonexistent', 5)).rejects.toThrow(
        NotFoundException
      );
      expect(itemRepository.save).not.toHaveBeenCalled();
      expect(itemRepository.delete).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for negative quantity', async () => {
      await expect(service.updateQuantity('item1', -1)).rejects.toThrow(
        BadRequestException
      );
      expect(cartItemRepo.findWithRelations).not.toHaveBeenCalled();
    });
  });

  describe('adjustQuantity', () => {
    it('should increment quantity by positive delta', async () => {
      const adjustedItem = { ...mockCartItem, quantity: 5 } as CartItem;

      cartItemRepo.findWithRelations!.mockResolvedValue(mockCartItem);
      itemRepository.save!.mockResolvedValue(adjustedItem);

      const result = await service.adjustQuantity('item1', 3);

      expect(result).toEqual(adjustedItem);
      expect(mockCartItem.quantity).toBe(5); // 2 + 3
    });

    it('should decrement quantity by negative delta', async () => {
      const decrementedItem = { ...mockCartItem, quantity: 1 } as CartItem;

      cartItemRepo.findWithRelations!.mockResolvedValue(mockCartItem);
      itemRepository.save!.mockResolvedValue(decrementedItem);

      const result = await service.adjustQuantity('item1', -1);

      expect(result).toEqual(decrementedItem);
      expect(mockCartItem.quantity).toBe(1); // 2 - 1
    });

    it('should throw BadRequestException for zero delta', async () => {
      await expect(service.adjustQuantity('item1', 0)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException when result would be negative', async () => {
      cartItemRepo.findWithRelations!.mockResolvedValue(mockCartItem);

      await expect(service.adjustQuantity('item1', -5)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw NotFoundException when item not found', async () => {
      cartItemRepo.findWithRelations!.mockResolvedValue(null);

      await expect(service.adjustQuantity('nonexistent', 1)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should handle null quantity on existing item', async () => {
      const itemWithNullQuantity = { ...mockCartItem, quantity: null } as any;
      const adjustedItem = { ...mockCartItem, quantity: 3 } as CartItem;

      cartItemRepo.findWithRelations!.mockResolvedValue(itemWithNullQuantity);
      itemRepository.save!.mockResolvedValue(adjustedItem);

      await service.adjustQuantity('item1', 3);

      expect(itemWithNullQuantity.quantity).toBe(3); // 0 + 3
    });
  });

  describe('findByCart', () => {
    it('should return cart items with variants', async () => {
      const cartItems = [mockCartItem];
      cartItemRepo.findByCart!.mockResolvedValue(cartItems);

      const result = await service.findByCart('cart1');

      expect(result).toEqual(cartItems);
      expect(cartItemRepo.findByCart).toHaveBeenCalledWith('cart1');
    });

    it('should return empty array for empty cart', async () => {
      cartItemRepo.findByCart!.mockResolvedValue([]);

      const result = await service.findByCart('empty-cart');

      expect(result).toEqual([]);
    });
  });

  describe('inherited BaseService methods', () => {
    it('should delegate CRUD operations to repository', async () => {
      const mockItems = [mockCartItem];

      cartItemRepo.findAll!.mockResolvedValue(mockItems);
      cartItemRepo.findById!.mockResolvedValue(mockCartItem);
      cartItemRepo.createEntity!.mockResolvedValue(mockCartItem);

      await service.findAll();
      await service.findOne('item1');
      await service.create(mockCartItemDto);

      expect(cartItemRepo.findAll).toHaveBeenCalled();
      expect(cartItemRepo.findById).toHaveBeenCalledWith('item1');
      expect(cartItemRepo.createEntity).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle repository connection errors', async () => {
      const connectionError = new Error('Database connection lost');
      cartItemRepo.findByCart!.mockRejectedValue(connectionError);

      await expect(service.findByCart('cart1')).rejects.toThrow(
        connectionError
      );
    });

    it('should handle constraint violations', async () => {
      const constraintError = new Error('Foreign key constraint violation');
      cartItemRepo.createEntity!.mockRejectedValue(constraintError);

      await expect(
        service.createWithCartAndVariant(mockCartItemDto)
      ).rejects.toThrow(constraintError);
    });
  });

  describe('concurrent operations', () => {
    it('should handle concurrent addOrIncrement operations', async () => {
      const newItem = { ...mockCartItem, quantity: 1 } as CartItem;

      cartItemRepo.findByCartAndVariant!.mockResolvedValue(null);
      itemRepository.create!.mockReturnValue(newItem);
      itemRepository.save!.mockResolvedValue(newItem);

      const concurrentAdds = Array.from({ length: 3 }, () =>
        service.addOrIncrement('cart1', 'variant1', 1)
      );

      const results = await Promise.all(concurrentAdds);

      expect(results).toHaveLength(3);
      expect(cartItemRepo.findByCartAndVariant).toHaveBeenCalledTimes(3);
    });
  });
});
