import { Test, TestingModule } from '@nestjs/testing';
import { CartItemController } from 'src/modules/store/cart/cart-item/cart-item.controller';
import { CartItemService } from 'src/modules/store/cart/cart-item/cart-item.service';
import { CartItem } from 'src/entities/store/cart/cart-item.entity';
import { CartItemDto } from 'src/modules/store/cart/cart-item/dto/cart-item.dto';
import {
  createGuardMock,
  createPolicyMock,
  createServiceMock,
  MockedMethods,
} from '../utils/helpers';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PolicyService } from 'src/modules/auth/policy/policy.service';
import { JwtAuthGuard } from 'src/modules/auth/policy/guards/jwt-auth.guard';
import { StoreRolesGuard } from 'src/modules/auth/policy/guards/store-roles.guard';
import { AdminGuard } from 'src/modules/auth/policy/guards/admin.guard';

describe('CartItemController', () => {
  let controller: CartItemController;
  let cartItemService: Partial<MockedMethods<CartItemService>>;
  let policyMock: Partial<MockedMethods<PolicyService>>;

  // Mock data
  const mockCartItem: CartItem = {
    id: 'item1',
    cart: { id: 'cart1' },
    variant: { id: 'variant1', name: 'Test Variant' },
    quantity: 2,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  } as unknown as CartItem;

  const mockCartItemList: CartItem[] = [
    mockCartItem,
    {
      id: 'item2',
      cart: { id: 'cart1' },
      variant: { id: 'variant2', name: 'Test Variant 2' },
      quantity: 1,
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
    } as unknown as CartItem,
  ];

  const mockCartItemDto: CartItemDto = {
    cartId: 'cart1',
    variantId: 'variant1',
    quantity: 2,
  } as CartItemDto;

  const validStoreId = '550e8400-e29b-41d4-a716-446655440000';
  const validUserId = '550e8400-e29b-41d4-a716-446655440001';
  const validItemId = '550e8400-e29b-41d4-a716-446655440002';

  beforeEach(async () => {
    cartItemService = createServiceMock<CartItemService>([
      'findAll',
      'findOne',
      'create',
      'update',
      'remove',
      'createWithCartAndVariant',
      'addOrIncrement',
      'updateQuantity',
      'adjustQuantity',
      'findByCart',
    ]);
    policyMock = createPolicyMock();
    const guardMock = createGuardMock();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CartItemController],
      providers: [
        { provide: CartItemService, useValue: cartItemService },
        { provide: PolicyService, useValue: policyMock },
        {
          provide: JwtAuthGuard,
          useValue: guardMock,
        },
        {
          provide: StoreRolesGuard,
          useValue: guardMock,
        },
        {
          provide: AdminGuard,
          useValue: guardMock,
        },
      ],
    }).compile();

    controller = module.get<CartItemController>(CartItemController);
    jest.clearAllMocks();
  });

  describe('module setup', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have CartItemService injected', () => {
      expect(controller['cartItemService']).toBeDefined();
      expect(controller['service']).toBe(cartItemService);
    });

    it('should extend BaseController', () => {
      expect(controller).toBeInstanceOf(CartItemController);
      expect(typeof controller.findAll).toBe('function');
      expect(typeof controller.findOne).toBe('function');
      expect(typeof controller.create).toBe('function');
      expect(typeof controller.update).toBe('function');
      expect(typeof controller.remove).toBe('function');
    });

    it('should have static accessPolicies defined', () => {
      expect(CartItemController.accessPolicies).toBeDefined();
      expect(CartItemController.accessPolicies.findAll).toEqual({
        requireAuthenticated: true,
      });
      expect(CartItemController.accessPolicies.addOrIncrement).toEqual({
        requireAuthenticated: true,
      });
      expect(CartItemController.accessPolicies.updateQuantity).toEqual({
        requireAuthenticated: true,
      });
    });
  });

  describe('addOrIncrement - POST /add', () => {
    it('should add new item to cart', async () => {
      const newCartItem = { ...mockCartItem, id: 'newItem' } as CartItem;
      cartItemService.addOrIncrement!.mockResolvedValue(newCartItem);

      const result = await controller.addOrIncrement(
        validStoreId,
        validUserId,
        mockCartItemDto
      );

      expect(result).toEqual(newCartItem);
      expect(cartItemService.addOrIncrement).toHaveBeenCalledWith(
        mockCartItemDto.cartId,
        mockCartItemDto.variantId,
        mockCartItemDto.quantity
      );
      expect(cartItemService.addOrIncrement).toHaveBeenCalledTimes(1);
    });

    it('should increment existing item quantity', async () => {
      const incrementedItem = { ...mockCartItem, quantity: 4 } as CartItem;
      cartItemService.addOrIncrement!.mockResolvedValue(incrementedItem);

      const result = await controller.addOrIncrement(
        validStoreId,
        validUserId,
        mockCartItemDto
      );

      expect(result).toEqual(incrementedItem);
      expect(cartItemService.addOrIncrement).toHaveBeenCalledWith(
        mockCartItemDto.cartId,
        mockCartItemDto.variantId,
        mockCartItemDto.quantity
      );
    });

    it('should handle default quantity when not provided', async () => {
      const dtoWithoutQuantity = {
        ...mockCartItemDto,
        quantity: undefined,
      } as unknown as CartItemDto;
      cartItemService.addOrIncrement!.mockResolvedValue(mockCartItem);

      await controller.addOrIncrement(
        validStoreId,
        validUserId,
        dtoWithoutQuantity
      );

      expect(cartItemService.addOrIncrement).toHaveBeenCalledWith(
        dtoWithoutQuantity.cartId,
        dtoWithoutQuantity.variantId,
        undefined
      );
    });

    it('should handle service validation errors', async () => {
      const validationError = new BadRequestException('Quantity must be > 0');
      cartItemService.addOrIncrement!.mockRejectedValue(validationError);

      await expect(
        controller.addOrIncrement(validStoreId, validUserId, mockCartItemDto)
      ).rejects.toThrow(BadRequestException);
      expect(cartItemService.addOrIncrement).toHaveBeenCalledWith(
        mockCartItemDto.cartId,
        mockCartItemDto.variantId,
        mockCartItemDto.quantity
      );
    });

    it('should handle missing cart or variant errors', async () => {
      const notFoundError = new NotFoundException('Cart not found');
      cartItemService.addOrIncrement!.mockRejectedValue(notFoundError);

      await expect(
        controller.addOrIncrement(validStoreId, validUserId, mockCartItemDto)
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle large quantity values', async () => {
      const largeQuantityDto = { ...mockCartItemDto, quantity: 999 };
      const largeQuantityItem = { ...mockCartItem, quantity: 999 } as CartItem;
      cartItemService.addOrIncrement!.mockResolvedValue(largeQuantityItem);

      const result = await controller.addOrIncrement(
        validStoreId,
        validUserId,
        largeQuantityDto
      );

      expect(result.quantity).toBe(999);
      expect(cartItemService.addOrIncrement).toHaveBeenCalledWith(
        largeQuantityDto.cartId,
        largeQuantityDto.variantId,
        999
      );
    });
  });

  describe('updateQuantity - PUT /:itemId', () => {
    it('should update item quantity', async () => {
      const updatedItem = { ...mockCartItem, quantity: 5 } as CartItem;
      const updateDto = { quantity: 5 } as CartItemDto;
      cartItemService.updateQuantity!.mockResolvedValue(updatedItem);

      const result = await controller.updateQuantity(
        validStoreId,
        validUserId,
        validItemId,
        updateDto
      );

      expect(result).toEqual(updatedItem);
      expect(cartItemService.updateQuantity).toHaveBeenCalledWith(
        validItemId,
        5
      );
      expect(cartItemService.updateQuantity).toHaveBeenCalledTimes(1);
    });

    it('should remove item when quantity is 0', async () => {
      const removedItem = { ...mockCartItem, quantity: 0 } as CartItem;
      const removeDto = { quantity: 0 } as CartItemDto;
      cartItemService.updateQuantity!.mockResolvedValue(removedItem);

      const result = await controller.updateQuantity(
        validStoreId,
        validUserId,
        validItemId,
        removeDto
      );

      expect(result).toEqual(removedItem);
      expect(cartItemService.updateQuantity).toHaveBeenCalledWith(
        validItemId,
        0
      );
    });

    it('should default to 0 when quantity not provided', async () => {
      const removedItem = { ...mockCartItem, quantity: 0 } as CartItem;
      const emptyDto = {} as CartItemDto;
      cartItemService.updateQuantity!.mockResolvedValue(removedItem);

      const result = await controller.updateQuantity(
        validStoreId,
        validUserId,
        validItemId,
        emptyDto
      );

      expect(result).toEqual(removedItem);
      expect(cartItemService.updateQuantity).toHaveBeenCalledWith(
        validItemId,
        0
      );
    });

    it('should handle item not found', async () => {
      const notFoundError = new NotFoundException('Cart item not found');
      cartItemService.updateQuantity!.mockRejectedValue(notFoundError);

      await expect(
        controller.updateQuantity(
          validStoreId,
          validUserId,
          'nonexistent',
          mockCartItemDto
        )
      ).rejects.toThrow(NotFoundException);
      expect(cartItemService.updateQuantity).toHaveBeenCalledWith(
        'nonexistent',
        mockCartItemDto.quantity
      );
    });

    it('should handle negative quantity validation', async () => {
      const negativeDto = { quantity: -1 } as CartItemDto;
      const validationError = new BadRequestException(
        'Quantity cannot be negative'
      );
      cartItemService.updateQuantity!.mockRejectedValue(validationError);

      await expect(
        controller.updateQuantity(
          validStoreId,
          validUserId,
          validItemId,
          negativeDto
        )
      ).rejects.toThrow(BadRequestException);
      expect(cartItemService.updateQuantity).toHaveBeenCalledWith(
        validItemId,
        -1
      );
    });

    it('should handle floating point quantities', async () => {
      const floatDto = { quantity: 2.5 } as CartItemDto;
      const updatedItem = { ...mockCartItem, quantity: 2.5 } as CartItem;
      cartItemService.updateQuantity!.mockResolvedValue(updatedItem);

      const result = await controller.updateQuantity(
        validStoreId,
        validUserId,
        validItemId,
        floatDto
      );

      expect(result.quantity).toBe(2.5);
      expect(cartItemService.updateQuantity).toHaveBeenCalledWith(
        validItemId,
        2.5
      );
    });
  });

  describe('inherited BaseController methods', () => {
    describe('findAll', () => {
      it('should return all cart items', async () => {
        cartItemService.findAll!.mockResolvedValue(mockCartItemList);

        const result = await controller.findAll();

        expect(result).toEqual(mockCartItemList);
        expect(cartItemService.findAll).toHaveBeenCalledTimes(1);
      });
    });

    describe('findOne', () => {
      it('should return cart item by id', async () => {
        cartItemService.findOne!.mockResolvedValue(mockCartItem);

        const result = await controller.findOne('item1');

        expect(result).toEqual(mockCartItem);
        expect(cartItemService.findOne).toHaveBeenCalledWith('item1');
      });

      it('should throw NotFoundException when item not found', async () => {
        cartItemService.findOne!.mockRejectedValue(
          new NotFoundException('Cart item not found')
        );

        await expect(controller.findOne('nonexistent')).rejects.toThrow(
          NotFoundException
        );
      });
    });

    describe('create', () => {
      it('should create new cart item', async () => {
        cartItemService.create!.mockResolvedValue(mockCartItem);

        const result = await controller.create(mockCartItemDto);

        expect(result).toEqual(mockCartItem);
        expect(cartItemService.create).toHaveBeenCalledWith(mockCartItemDto);
      });
    });

    describe('update', () => {
      it('should update existing cart item', async () => {
        const updatedItem = { ...mockCartItem, quantity: 10 } as CartItem;
        cartItemService.update!.mockResolvedValue(updatedItem);

        const result = await controller.update('item1', mockCartItemDto);

        expect(result).toEqual(updatedItem);
        expect(cartItemService.update).toHaveBeenCalledWith(
          'item1',
          mockCartItemDto
        );
      });
    });

    describe('remove', () => {
      it('should remove cart item', async () => {
        cartItemService.remove!.mockResolvedValue(undefined);

        await controller.remove('item1');

        expect(cartItemService.remove).toHaveBeenCalledWith('item1');
      });
    });
  });

  describe('UUID validation', () => {
    it('should accept valid UUID parameters', async () => {
      cartItemService.addOrIncrement!.mockResolvedValue(mockCartItem);

      await controller.addOrIncrement(
        validStoreId,
        validUserId,
        mockCartItemDto
      );

      expect(cartItemService.addOrIncrement).toHaveBeenCalledWith(
        mockCartItemDto.cartId,
        mockCartItemDto.variantId,
        mockCartItemDto.quantity
      );
    });
  });

  describe('route parameter handling', () => {
    it('should handle all route parameters correctly', async () => {
      cartItemService.updateQuantity!.mockResolvedValue(mockCartItem);

      await controller.updateQuantity(
        validStoreId,
        validUserId,
        validItemId,
        mockCartItemDto
      );

      // Verify that storeId and userId are passed as parameters but not used in service call
      // (they're for route context/authorization)
      expect(cartItemService.updateQuantity).toHaveBeenCalledWith(
        validItemId,
        mockCartItemDto.quantity
      );
    });
  });

  describe('error handling scenarios', () => {
    it('should handle service timeout errors', async () => {
      const timeoutError = new Error('Service timeout');
      cartItemService.addOrIncrement!.mockRejectedValue(timeoutError);

      await expect(
        controller.addOrIncrement(validStoreId, validUserId, mockCartItemDto)
      ).rejects.toThrow(timeoutError);
    });

    it('should handle database constraint errors', async () => {
      const constraintError = new Error('Variant not found in store');
      cartItemService.addOrIncrement!.mockRejectedValue(constraintError);

      await expect(
        controller.addOrIncrement(validStoreId, validUserId, mockCartItemDto)
      ).rejects.toThrow(constraintError);
    });
  });

  describe('concurrent operations', () => {
    it('should handle concurrent add operations', async () => {
      cartItemService.addOrIncrement!.mockResolvedValue(mockCartItem);

      const concurrentAdds = Array.from({ length: 5 }, () =>
        controller.addOrIncrement(validStoreId, validUserId, mockCartItemDto)
      );

      const results = await Promise.all(concurrentAdds);

      expect(results).toHaveLength(5);
      expect(results.every((result) => result === mockCartItem)).toBe(true);
      expect(cartItemService.addOrIncrement).toHaveBeenCalledTimes(5);
    });

    it('should handle concurrent quantity updates', async () => {
      const quantities = [1, 2, 3, 4, 5];
      cartItemService.updateQuantity!.mockImplementation((_, qty) =>
        Promise.resolve({ ...mockCartItem, quantity: qty } as CartItem)
      );

      const concurrentUpdates = quantities.map((qty) =>
        controller.updateQuantity(validStoreId, validUserId, validItemId, {
          quantity: qty,
        } as CartItemDto)
      );

      const results = await Promise.all(concurrentUpdates);

      expect(results).toHaveLength(5);
      expect(cartItemService.updateQuantity).toHaveBeenCalledTimes(5);
      quantities.forEach((qty, index) => {
        expect(results[index].quantity).toBe(qty);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty DTO objects', async () => {
      const emptyDto = {} as CartItemDto;
      cartItemService.addOrIncrement!.mockResolvedValue(mockCartItem);

      await controller.addOrIncrement(validStoreId, validUserId, emptyDto);

      expect(cartItemService.addOrIncrement).toHaveBeenCalledWith(
        undefined,
        undefined,
        undefined
      );
    });

    it('should handle null quantity values', async () => {
      const nullQuantityDto = { ...mockCartItemDto, quantity: null } as any;
      cartItemService.updateQuantity!.mockResolvedValue(mockCartItem);

      await controller.updateQuantity(
        validStoreId,
        validUserId,
        validItemId,
        nullQuantityDto
      );

      expect(cartItemService.updateQuantity).toHaveBeenCalledWith(
        validItemId,
        0
      );
    });
  });
});
