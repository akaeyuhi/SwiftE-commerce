import { UserRepository } from 'src/modules/user/user.repository';

describe('UserRepository (unit)', () => {
  let repo: UserRepository;

  beforeEach(() => {
    repo = Object.create(UserRepository.prototype) as UserRepository;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('findByEmail delegates to findOne', async () => {
    repo.findOne = jest.fn().mockResolvedValue({ id: 'u1', email: 'a@b' });
    const res = await repo.findByEmail('a@b');
    expect(repo.findOne).toHaveBeenCalledWith({
      where: { email: 'a@b' },
    });
    expect(res).toEqual({ id: 'u1', email: 'a@b' });
  });

  it('getUserWithPassword uses query builder chain', async () => {
    // mock createQueryBuilder chain on the repo instance
    const qb: any = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest
        .fn()
        .mockResolvedValue({ id: 'u1', password: 'h', email: 'a@b' }),
    };
    repo.createQueryBuilder = jest.fn().mockReturnValue(qb);

    const res = await repo.getUserWithPassword('a@b');
    expect((repo as any).createQueryBuilder).toHaveBeenCalledWith('user');
    expect(qb.where).toHaveBeenCalledWith('user.email = :email', {
      email: 'a@b',
    });
    expect(res).toEqual({ id: 'u1', password: 'h', email: 'a@b' });
  });

  it('removeRoleFromUser builds and executes delete query', async () => {
    const deleteExec = jest.fn().mockResolvedValue({ affected: 1 });
    const deleteQb: any = {
      delete: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: deleteExec,
    };
    const repoManagerMock: any = {
      getRepository: jest.fn().mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue(deleteQb),
      }),
    };
    (repo as any).manager = repoManagerMock;

    await repo.removeRoleFromUser('u1', 'r1', 's1');
    expect(repoManagerMock.getRepository).toHaveBeenCalledWith('UserRole');
    expect(deleteQb.where).toHaveBeenCalled();
    expect(deleteQb.andWhere).toHaveBeenCalled();
    expect(deleteExec).toHaveBeenCalled();
  });
});
