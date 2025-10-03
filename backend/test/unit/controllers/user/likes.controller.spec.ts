import { Test, TestingModule } from '@nestjs/testing';
import { LikesController } from 'src/modules/user/likes/likes/likes.controller';
import { LikesService } from 'src/modules/user/likes/likes/likes.service';
import { CreateLikeDto } from 'src/modules/user/likes/likes/dto/create-like.dto';
import { Like } from 'src/entities/user/like.entity';
import { JwtAuthGuard } from 'src/modules/authorization/guards/jwt-auth.guard';
import { RecordEventInterceptor } from 'src/modules/infrastructure/interceptors/record-event/record-event.interceptor';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { TestInterceptor } from 'test/unit/utils/helpers';

describe('LikesController', () => {
  let controller: LikesController;
  let service: Partial<Record<keyof LikesService, jest.Mock>>;

  const mockLike: Like = { id: 'l1' } as Like;
  const userId = 'u1';
  const productId = 'p1';
  const storeId = 's1';

  const reqUser = { id: userId, isSiteAdmin: false };
  const siteAdmin = { id: 'other', isSiteAdmin: true };

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      removeById: jest.fn(),
      listForUser: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LikesController],
      providers: [{ provide: LikesService, useValue: service }],
    })
      // override guards to allow direct invocation
      .overrideGuard(JwtAuthGuard)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .useValue({ canActivate: (_ctx: ExecutionContext) => true })
      .overrideInterceptor(RecordEventInterceptor)
      .useValue(new TestInterceptor())
      .compile();

    controller = module.get<LikesController>(LikesController);
  });

  describe('addProductLike', () => {
    it('should create a product like when user matches', async () => {
      const dto: CreateLikeDto = { productId } as CreateLikeDto;
      service.create!.mockResolvedValue(mockLike);

      const result = await controller.addProductLike(userId, dto, {
        user: reqUser,
      } as any);

      expect(service.create).toHaveBeenCalledWith({ ...dto, userId });
      expect(result).toBe(mockLike);
    });

    it('should allow site admin to create product like for any user', async () => {
      const dto: CreateLikeDto = { productId } as CreateLikeDto;
      service.create!.mockResolvedValue(mockLike);

      const result = await controller.addProductLike(userId, dto, {
        user: siteAdmin,
      } as any);

      expect(service.create).toHaveBeenCalled();
      expect(result).toBe(mockLike);
    });

    it('should throw ForbiddenException when unauthorized', async () => {
      await expect(
        controller.addProductLike(userId, { productId } as CreateLikeDto, {
          user: { id: 'other', isSiteAdmin: false },
        })
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('addStoreLike', () => {
    it('should create a store like when user matches', async () => {
      const dto: CreateLikeDto = { storeId } as CreateLikeDto;
      service.create!.mockResolvedValue(mockLike);

      const result = await controller.addStoreLike(userId, dto, {
        user: reqUser,
      } as any);

      expect(service.create).toHaveBeenCalledWith({ ...dto, userId });
      expect(result).toBe(mockLike);
    });

    it('should throw when unauthorized', async () => {
      await expect(
        controller.addStoreLike(userId, { storeId } as CreateLikeDto, {
          user: { id: 'x', isSiteAdmin: false },
        })
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('removeLike', () => {
    it('should remove like when user matches', async () => {
      service.removeById!.mockResolvedValue(undefined);

      const result = await controller.removeLike(userId, 'l1', {
        user: reqUser,
      } as any);

      expect(service.removeById).toHaveBeenCalledWith('l1');
      expect(result).toEqual({ success: true });
    });

    it('should allow site admin to remove like for any user', async () => {
      service.removeById!.mockResolvedValue(undefined);

      const result = await controller.removeLike(userId, 'l1', {
        user: siteAdmin,
      } as any);

      expect(result).toEqual({ success: true });
    });

    it('should throw when unauthorized', async () => {
      await expect(
        controller.removeLike(userId, 'l1', {
          user: { id: 'y', isSiteAdmin: false },
        })
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('listLikes', () => {
    it('should list likes when user matches', async () => {
      const likes = [mockLike];
      service.listForUser!.mockResolvedValue(likes);

      const result = await controller.listLikes(userId, {
        user: reqUser,
      } as any);

      expect(service.listForUser).toHaveBeenCalledWith(userId);
      expect(result).toBe(likes);
    });

    it('should allow site admin to list for any user', async () => {
      const likes = [mockLike];
      service.listForUser!.mockResolvedValue(likes);

      const result = await controller.listLikes(userId, {
        user: siteAdmin,
      } as any);

      expect(result).toBe(likes);
    });

    it('should throw when unauthorized', async () => {
      await expect(
        controller.listLikes(userId, { user: { id: 'z', isSiteAdmin: false } })
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
