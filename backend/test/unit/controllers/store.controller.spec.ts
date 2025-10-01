import { Test, TestingModule } from '@nestjs/testing';
import { StoreController } from 'src/modules/store/store.controller';
import { StoreService } from 'src/modules/store/store.service';
import { CreateStoreDto } from 'src/modules/store/dto/create-store.dto';
import { UpdateStoreDto } from 'src/modules/store/dto/update-store.dto';
import {
  createGuardMock,
  createPolicyMock,
  createServiceMock,
  MockedMethods,
} from '../utils/helpers';
import { JwtAuthGuard } from 'src/modules/authorization/guards/jwt-auth.guard';
import { StoreRolesGuard } from 'src/modules/authorization/guards/store-roles.guard';
import { AdminGuard } from 'src/modules/authorization/guards/admin.guard';
import { PolicyService } from 'src/modules/authorization/policy/policy.service';
import { jest } from '@jest/globals';

describe('StoreController', () => {
  let controller: StoreController;
  let service: Partial<MockedMethods<StoreService>>;
  let policyMock: Partial<MockedMethods<PolicyService>>;

  beforeEach(async () => {
    service = createServiceMock<StoreService>([
      'create',
      'findOne',
      'findAll',
      'update',
      'remove',
    ]);
    policyMock = createPolicyMock();
    const guardMock = createGuardMock();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StoreController],
      providers: [
        { provide: StoreService, useValue: service },
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

    controller = module.get<StoreController>(StoreController);
  });

  afterEach(() => jest.clearAllMocks());

  it('create should delegate to service.create', async () => {
    const dto: CreateStoreDto = { name: 'S' } as any;
    const out = { id: 's1', name: 'S' } as any;
    service.create!.mockResolvedValue(out);

    const res = await controller.create(dto);
    expect(service.create).toHaveBeenCalledWith(dto);
    expect(res).toEqual(out);
  });

  it('findAll delegates to service.findAll', async () => {
    const items = [{ id: 's1' }] as any;
    service.findAll!.mockResolvedValue(items as never);
    const res = await controller.findAll();
    expect(service.findAll).toHaveBeenCalled();
    expect(res).toEqual(items);
  });

  it('findOne delegates to service.findOne', async () => {
    const out = { id: 's1', name: 'X' } as any;
    service.findOne!.mockResolvedValue(out);
    const res = await controller.findOne('s1');
    expect(service.findOne).toHaveBeenCalledWith('s1');
    expect(res).toEqual(out);
  });

  it('update delegates to service.update', async () => {
    const dto: UpdateStoreDto = { name: 'Updated' } as any;
    const updated = { id: 's1', name: 'Updated' } as any;
    service.update!.mockResolvedValue(updated);

    const res = await controller.update('s1', dto);
    expect(service.update).toHaveBeenCalledWith('s1', dto);
    expect(res).toEqual(updated);
  });

  it('remove delegates to service.remove', async () => {
    service.remove!.mockResolvedValue(undefined);
    const res = await controller.remove('s1');
    expect(service.remove).toHaveBeenCalledWith('s1');
    expect(res).toBeUndefined();
  });
});
