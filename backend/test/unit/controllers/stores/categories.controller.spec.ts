import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesController } from 'src/modules/store/categories/categories.controller';
import { CategoriesService } from 'src/modules/store/categories/categories.service';
import { Category } from 'src/entities/store/product/category.entity';
import {
  createGuardMock,
  createPolicyMock,
  createServiceMock,
  MockedMethods,
} from 'test/unit/helpers';
import { PolicyService } from 'src/modules/authorization/policy/policy.service';
import { JwtAuthGuard } from 'src/modules/authorization/guards/jwt-auth.guard';
import { StoreRolesGuard } from 'src/modules/authorization/guards/store-roles.guard';
import { AdminGuard } from 'src/modules/authorization/guards/admin.guard';

describe('CategoriesController', () => {
  let controller: CategoriesController;
  let service: Partial<MockedMethods<CategoriesService>>;
  let policyMock: Partial<MockedMethods<PolicyService>>;

  const mockCategory: Category = {
    id: 'c1',
    name: 'Cat',
    description: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;
  const mockList: Category[] = [mockCategory];

  beforeEach(async () => {
    service = createServiceMock<CategoriesService>([
      'findAll',
      'findOne',
      'create',
      'update',
      'remove',
      'getTree',
    ]);
    policyMock = createPolicyMock();
    const guardMock = createGuardMock();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        { provide: CategoriesService, useValue: service },
        { provide: PolicyService, useValue: policyMock },
        {
          provide: JwtAuthGuard,
          useValue: guardMock,
        },
        {
          provide: StoreRolesGuard,
          useValue: guardMock,
        },
        {
          provide: AdminGuard,
          useValue: guardMock,
        },
      ],
    }).compile();

    controller = module.get<CategoriesController>(CategoriesController);
    jest.clearAllMocks();
  });

  describe('getTree', () => {
    it('returns category tree', async () => {
      service.getTree!.mockResolvedValue(mockList);
      const res = await controller.getTree();
      expect(service.getTree).toHaveBeenCalledTimes(1);
      expect(res).toEqual(mockList);
    });
  });

  describe('BaseController inherited methods', () => {
    it('delegates findAll', async () => {
      service.findAll!.mockResolvedValue(mockList);
      const res = await controller.findAll();
      expect(service.findAll).toHaveBeenCalledTimes(1);
      expect(res).toEqual(mockList);
    });

    it('delegates findOne', async () => {
      service.findOne!.mockResolvedValue(mockCategory);
      const res = await controller.findOne('c1');
      expect(service.findOne).toHaveBeenCalledWith('c1');
      expect(res).toEqual(mockCategory);
    });

    it('delegates create', async () => {
      const dto = { name: 'New', description: '' };
      service.create!.mockResolvedValue(mockCategory);
      const res = await controller.create(dto as any);
      expect(service.create).toHaveBeenCalledWith(dto);
      expect(res).toEqual(mockCategory);
    });

    it('delegates update', async () => {
      const dto = { name: 'Updated' };
      service.update!.mockResolvedValue(mockCategory);
      const res = await controller.update('c1', dto as any);
      expect(service.update).toHaveBeenCalledWith('c1', dto);
      expect(res).toEqual(mockCategory);
    });

    it('delegates remove', async () => {
      service.remove!.mockResolvedValue(undefined);
      await controller.remove('c1');
      expect(service.remove).toHaveBeenCalledWith('c1');
    });
  });
});
