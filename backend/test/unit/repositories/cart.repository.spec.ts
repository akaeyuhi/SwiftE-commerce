import { CartRepository } from 'src/modules/store/cart/cart.repository';
import { ShoppingCart } from 'src/entities/store/cart/cart.entity';

describe('CartRepository (unit)', () => {
  let repo: CartRepository & any;

  beforeEach(() => {
    repo = Object.create(CartRepository.prototype) as CartRepository & any;

    repo.findOne = jest.fn();
    repo.find = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('findByUserAndStore should call findOne with where + relations', async () => {
    const expected: Partial<ShoppingCart> = { id: 'c1' };
    repo.findOne.mockResolvedValue(expected);

    const res = await repo.findByUserAndStore('user-1', 'store-1');
    expect(repo.findOne).toHaveBeenCalledWith({
      where: {
        user: { id: 'user-1' },
        store: { id: 'store-1' },
      },
      relations: ['store', 'items', 'items.variant'],
    });
    expect(res).toEqual(expected);
  });

  it('findAllByUser should call find with where + relations + order', async () => {
    repo.find.mockResolvedValue([]);
    const res = await repo.findAllByUser('user-1');
    expect(repo.find).toHaveBeenCalledWith({
      where: { user: { id: 'user-1' } },
      relations: ['store', 'items', 'items.variant'],
      order: { updatedAt: 'DESC' },
    });
    expect(res).toEqual([]);
  });

  it('findWithItems should call findOne with items, variant, store and user relation', async () => {
    const cart: Partial<ShoppingCart> = { id: 'cart1' };
    repo.findOne.mockResolvedValue(cart);
    const res = await repo.findWithItems('cart1');
    expect(repo.findOne).toHaveBeenCalledWith({
      where: { id: 'cart1' },
      relations: ['items', 'items.variant', 'store', 'user'],
    });
    expect(res).toEqual(cart);
  });
});
