import { DataSource, EntityManager } from 'typeorm';
import { LikesRepository } from 'src/modules/user/likes/likes/likes.repository';
import { Like } from 'src/entities/user/like.entity';
import { createMock, MockedMethods } from '../utils/helpers';

describe('LikesRepository', () => {
  let repo: LikesRepository;
  let manager: Partial<MockedMethods<EntityManager>>;
  let dataSource: Partial<MockedMethods<DataSource>>;

  beforeEach(() => {
    manager = createMock<EntityManager>(['findOne', 'find']);
    dataSource = createMock<DataSource>(['createEntityManager']);
    dataSource.createEntityManager!.mockReturnValue(manager as any);
    repo = new LikesRepository(dataSource as any);
  });

  describe('findByUserAndProduct', () => {
    it('should call findOne with correct where clause', async () => {
      const like = { id: 'l1' } as Like;
      manager.findOne!.mockResolvedValue(like);

      const result = await repo.findByUserAndProduct('u1', 'p1');

      expect(manager.findOne).toHaveBeenCalledWith({
        where: { user: { id: 'u1' }, product: { id: 'p1' } },
      });
      expect(result).toEqual(like);
    });
  });

  describe('findByUserAndStore', () => {
    it('should call findOne with correct where clause', async () => {
      const like = { id: 'l2' } as Like;
      manager.findOne!.mockResolvedValue(like);

      const result = await repo.findByUserAndStore('u1', 's1');

      expect(manager.findOne).toHaveBeenCalledWith({
        where: { user: { id: 'u1' }, store: { id: 's1' } },
      });
      expect(result).toEqual(like);
    });
  });

  describe('listByUser', () => {
    it('should call find with correct where, relations, and order', async () => {
      const likes = [{ id: 'l1' }] as Like[];
      manager.find!.mockResolvedValue(likes);

      const result = await repo.listByUser('u1');

      expect(manager.find).toHaveBeenCalledWith({
        where: { user: { id: 'u1' } },
        relations: ['product', 'store'],
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(likes);
    });
  });
});
