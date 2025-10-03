import { Test } from '@nestjs/testing';
import { RefreshTokenRepository } from 'src/modules/auth/refresh-token/refresh-token.repository';
import { DataSource, EntityManager } from 'typeorm';
import { createMock, MockedMethods } from 'test/unit/utils/helpers';

describe('RefreshTokenRepository', () => {
  let repo: RefreshTokenRepository;
  let ds: Partial<MockedMethods<DataSource>>;
  let em: Partial<MockedMethods<EntityManager>>;

  beforeEach(async () => {
    em = createMock<EntityManager>([]);
    ds = createMock<DataSource>(['createEntityManager']);
    ds.createEntityManager!.mockReturnValue(em as unknown as EntityManager);

    const mod = await Test.createTestingModule({
      providers: [
        RefreshTokenRepository,
        { provide: DataSource, useValue: ds },
      ],
    }).compile();

    repo = mod.get<RefreshTokenRepository>(RefreshTokenRepository);
  });

  it('inherits BaseRepository methods', () => {
    expect(typeof repo.findAll).toBe('function');
    expect(typeof repo.findById).toBe('function');
    expect(typeof repo.createEntity).toBe('function');
    expect(typeof repo.deleteById).toBe('function');
  });

  it('initializes EntityManager', () => {
    expect(ds.createEntityManager).toHaveBeenCalledTimes(1);
  });
});
