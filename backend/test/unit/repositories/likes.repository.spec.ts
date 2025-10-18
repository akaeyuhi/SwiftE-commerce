import { DataSource, EntityManager } from 'typeorm';
import { LikesRepository } from 'src/modules/user/likes/likes/likes.repository';
import { Like } from 'src/entities/user/like.entity';
import {
  createMock,
  createMockEntityManager,
  MockedMethods,
} from 'test/unit/helpers';
import { Test, TestingModule } from '@nestjs/testing';

describe('LikesRepository', () => {
  let repo: LikesRepository;
  let manager: Partial<MockedMethods<EntityManager>>;
  let dataSource: Partial<MockedMethods<DataSource>>;

  beforeEach(async () => {
    manager = createMockEntityManager('findOne', 'find');
    dataSource = createMock<DataSource>(['createEntityManager']);
    dataSource.createEntityManager!.mockReturnValue(manager as any);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LikesRepository,
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    repo = module.get<LikesRepository>(LikesRepository);

    // Mock the inherited Repository methods
    jest.spyOn(repo, 'find').mockImplementation(jest.fn());
    jest.spyOn(repo, 'findOne').mockImplementation(jest.fn());
    jest.spyOn(repo, 'findOneBy').mockImplementation(jest.fn());
    jest.spyOn(repo, 'delete').mockImplementation(jest.fn());
    jest.spyOn(repo, 'create').mockImplementation(jest.fn());
    jest.spyOn(repo, 'save').mockImplementation(jest.fn());
    jest.spyOn(repo, 'update').mockImplementation(jest.fn());
  });

  describe('findByUserAndProduct', () => {
    it('should call findOne with correct where clause', async () => {
      const like = { id: 'l1' } as Like;
      (repo.findOne as jest.Mock)!.mockResolvedValue(like);

      const result = await repo.findByUserAndProduct('u1', 'p1');

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { user: { id: 'u1' }, product: { id: 'p1' } },
      });
      expect(result).toEqual(like);
    });
  });

  describe('findByUserAndStore', () => {
    it('should call findOne with correct where clause', async () => {
      const like = { id: 'l2' } as Like;
      (repo.findOne as jest.Mock)!.mockResolvedValue(like);

      const result = await repo.findByUserAndStore('u1', 's1');

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { user: { id: 'u1' }, store: { id: 's1' } },
      });
      expect(result).toEqual(like);
    });
  });

  describe('listByUser', () => {
    it('should call find with correct where, relations, and order', async () => {
      const likes = [{ id: 'l1' }] as Like[];
      (repo.find as jest.Mock)!.mockResolvedValue(likes);

      const result = await repo.listByUser('u1');

      expect(repo.find).toHaveBeenCalledWith({
        where: { user: { id: 'u1' } },
        relations: ['product', 'store'],
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(likes);
    });
  });
});
