import { Test } from '@nestjs/testing';
import { ReviewsController } from 'src/modules/products/reviews/reviews.controller';
import { ReviewsService } from 'src/modules/products/reviews/reviews.service';
import { PolicyService } from 'src/modules/authorization/policy/policy.service';
import {
  createServiceMock,
  createPolicyMock,
  createGuardMock,
  MockedMethods,
} from 'test/utils/helpers';
import { Review } from 'src/entities/store/review.entity';
import { CreateReviewDto } from 'src/modules/products/reviews/dto/create-review.dto';
import { Request } from 'express';
import { User } from 'src/entities/user/user.entity';
import { Product } from 'src/entities/store/product/product.entity';
import { JwtAuthGuard } from 'src/modules/authorization/guards/jwt-auth.guard';
import { StoreRolesGuard } from 'src/modules/authorization/guards/store-roles.guard';

describe('ReviewsController', () => {
  let ctrl: ReviewsController;
  let svc: Partial<MockedMethods<ReviewsService>>;
  const policyMock = createPolicyMock();
  const guardMock = createGuardMock();

  const mock: Review = {
    id: 'r1',
    rating: 5,
    comment: 'C',
    user: { id: 'u1' } as User,
    product: { id: 'p1' } as Product,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Review;
  const dto: CreateReviewDto = { productId: 'p1', rating: 5, comment: 'C' };

  beforeEach(async () => {
    svc = createServiceMock<ReviewsService>([
      'findAllByProduct',
      'findOne',
      'createWithRelations',
    ]);
    const mod = await Test.createTestingModule({
      controllers: [ReviewsController],
      providers: [
        { provide: ReviewsService, useValue: svc },
        { provide: PolicyService, useValue: policyMock },
        { provide: JwtAuthGuard, useValue: guardMock },
        { provide: StoreRolesGuard, useValue: guardMock },
      ],
    }).compile();
    ctrl = mod.get<ReviewsController>(ReviewsController);
    jest.clearAllMocks();
  });

  it('createWithRelations passes author', async () => {
    svc.createWithRelations!.mockResolvedValue(mock);
    const req: any = { user: { id: 'u3' } };
    const res = await ctrl.createWithRelations(
      's1',
      'p1',
      dto as CreateReviewDto,
      req as Request
    );
    expect(svc.createWithRelations).toHaveBeenCalledWith(
      { ...dto, productId: 'p1' },
      'u3'
    );
    expect(res).toEqual(mock);
  });
});
