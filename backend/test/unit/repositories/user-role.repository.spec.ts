import { UserRoleRepository } from 'src/modules/user/user-role/user-role.repository';

describe('UserRoleRepository (unit)', () => {
  let repo: UserRoleRepository & any;

  beforeEach(() => {
    repo = Object.create(UserRoleRepository.prototype) as UserRoleRepository &
      any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('findAll delegates to find()', async () => {
    repo.find = jest.fn().mockResolvedValue([]);
    const res = await repo.findAll();
    expect(repo.find).toHaveBeenCalled();
    expect(res).toEqual([]);
  });

  it('findById delegates to findOneBy()', async () => {
    repo.findOneBy = jest.fn().mockResolvedValue({ id: 'r1' });
    const res = await repo.findById('r1');
    expect(repo.findOneBy).toHaveBeenCalledWith({ id: 'r1' });
    expect(res).toEqual({ id: 'r1' });
  });

  it('createEntity delegates to create and save', async () => {
    // stub create and save on instance
    repo.create = jest.fn().mockReturnValue({ roleName: 'X' });
    repo.save = jest.fn().mockResolvedValue({ id: 'r1', roleName: 'X' });
    const res = await repo.createEntity({ roleName: 'X' } as any);
    expect(repo.create).toHaveBeenCalledWith({ roleName: 'X' });
    expect(repo.save).toHaveBeenCalledWith({ roleName: 'X' });
    expect(res).toEqual({ id: 'r1', roleName: 'X' });
  });
});
