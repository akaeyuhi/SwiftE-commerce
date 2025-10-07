import { LikesService } from 'src/modules/user/likes/likes/likes.service';
import { LikesRepository } from 'src/modules/user/likes/likes/likes.repository';
import { CreateLikeDto } from 'src/modules/user/likes/likes/dto/create-like.dto';
import { Like } from 'src/entities/user/like.entity';
import { createMock, MockedMethods } from 'test/unit/helpers';

describe('LikesService', () => {
  let service: LikesService;
  let repo: Partial<MockedMethods<LikesRepository>>;

  beforeEach(() => {
    repo = createMock<LikesRepository>([
      'findByUserAndProduct',
      'findByUserAndStore',
      'createEntity',
      'deleteById',
      'listByUser',
    ]);
    service = new LikesService(repo as any);
  });

  describe('create', () => {
    it('should throw if neither productId nor storeId provided', async () => {
      await expect(service.create({ userId: 'u1' } as any)).rejects.toThrow(
        'productId or storeId must be provided'
      );
    });

    it('should throw if both productId and storeId provided', async () => {
      const dto: CreateLikeDto = {
        userId: 'u1',
        productId: 'p1',
        storeId: 's1',
      } as CreateLikeDto;
      await expect(service.create(dto)).rejects.toThrow(
        'Provide only one of productId or storeId'
      );
    });

    it('should return existing like for product', async () => {
      const existing = { id: 'l1' } as Like;
      repo.findByUserAndProduct!.mockResolvedValue(existing);

      const dto: CreateLikeDto = {
        userId: 'u1',
        productId: 'p1',
      } as CreateLikeDto;
      const result = await service.create(dto);

      expect(repo.findByUserAndProduct).toHaveBeenCalledWith('u1', 'p1');
      expect(result).toBe(existing);
      expect(repo.createEntity).not.toHaveBeenCalled();
    });

    it('should create new like for product when none exists', async () => {
      repo.findByUserAndProduct!.mockResolvedValue(null);
      const created = { id: 'l2' } as Like;
      repo.createEntity!.mockResolvedValue(created);

      const dto: CreateLikeDto = {
        userId: 'u1',
        productId: 'p1',
      } as CreateLikeDto;
      const result = await service.create(dto);

      expect(repo.createEntity).toHaveBeenCalledWith({
        user: { id: 'u1' },
        product: { id: 'p1' },
      });
      expect(result).toBe(created);
    });

    it('should return existing like for store', async () => {
      const existing = { id: 'l3' } as Like;
      repo.findByUserAndStore!.mockResolvedValue(existing);

      const dto: CreateLikeDto = {
        userId: 'u1',
        storeId: 's1',
      } as CreateLikeDto;
      const result = await service.create(dto);

      expect(repo.findByUserAndStore).toHaveBeenCalledWith('u1', 's1');
      expect(result).toBe(existing);
    });

    it('should create new like for store when none exists', async () => {
      repo.findByUserAndStore!.mockResolvedValue(null);
      const created = { id: 'l4' } as Like;
      repo.createEntity!.mockResolvedValue(created);

      const dto: CreateLikeDto = {
        userId: 'u1',
        storeId: 's1',
      } as CreateLikeDto;
      const result = await service.create(dto);

      expect(repo.createEntity).toHaveBeenCalledWith({
        user: { id: 'u1' },
        store: { id: 's1' },
      });
      expect(result).toBe(created);
    });
  });

  describe('removeById', () => {
    it('should call deleteById on repository', async () => {
      await service.removeById('l1');
      expect(repo.deleteById).toHaveBeenCalledWith('l1');
    });
  });

  describe('listForUser', () => {
    it('should return all likes for user', async () => {
      const likes = [{ id: 'l1' }] as Like[];
      repo.listByUser!.mockResolvedValue(likes);

      const result = await service.listForUser('u1');

      expect(repo.listByUser).toHaveBeenCalledWith('u1');
      expect(result).toEqual(likes);
    });
  });
});
