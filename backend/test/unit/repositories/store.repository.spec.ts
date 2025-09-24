import { StoreRepository } from 'src/modules/store/store.repository';

describe('StoreRepository (unit)', () => {
  let repo: StoreRepository & any;

  beforeEach(() => {
    repo = Object.create(StoreRepository.prototype) as StoreRepository & any;
  });

  afterEach(() => jest.clearAllMocks());

  it('findStoreByName delegates to findOneBy and returns store', async () => {
    repo.findOneBy = jest
      .fn()
      .mockResolvedValue({ id: 's1', name: 'X' } as any);
    const res = await repo.findStoreByName('X');
    expect(repo.findOneBy).toHaveBeenCalledWith({ name: 'X' });
    expect(res).toEqual({ id: 's1', name: 'X' });
  });

  it('findAll delegates to find() (inherited behavior)', async () => {
    repo.find = jest.fn().mockResolvedValue([]);
    const res = await repo.findAll();
    expect(repo.find).toHaveBeenCalled();
    expect(res).toEqual([]);
  });
});
