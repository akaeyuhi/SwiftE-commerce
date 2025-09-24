import { Test, TestingModule } from '@nestjs/testing';
import { StoreController } from 'src/modules/store/store.controller';
import { StoreService } from 'src/modules/store/store.service';
import { CreateStoreDto } from 'src/modules/store/dto/create-store.dto';
import { UpdateStoreDto } from 'src/modules/store/dto/update-store.dto';
import { mockService } from 'test/unit/utils/test-helpers';

describe('StoreController', () => {
  let controller: StoreController;
  let service: jest.Mocked<Partial<StoreService>>;

  beforeEach(async () => {
    service = mockService(['create', 'findOne', 'findAll', 'update', 'remove']);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StoreController],
      providers: [{ provide: StoreService, useValue: service }],
    }).compile();

    controller = module.get<StoreController>(StoreController);
  });

  afterEach(() => jest.clearAllMocks());

  it('create should delegate to service.create', async () => {
    const dto: CreateStoreDto = { name: 'S' } as any;
    const out = { id: 's1', name: 'S' } as any;
    (service.create as jest.Mock).mockResolvedValue(out);

    const res = await controller.create(dto);
    expect(service.create).toHaveBeenCalledWith(dto);
    expect(res).toEqual(out);
  });

  it('findAll delegates to service.findAll', async () => {
    const items = [{ id: 's1' }] as any;
    (service.findAll as jest.Mock).mockResolvedValue(items);
    const res = await controller.findAll();
    expect(service.findAll).toHaveBeenCalled();
    expect(res).toEqual(items);
  });

  it('findOne delegates to service.findOne', async () => {
    const out = { id: 's1', name: 'X' } as any;
    (service.findOne as jest.Mock).mockResolvedValue(out);
    const res = await controller.findOne('s1');
    expect(service.findOne).toHaveBeenCalledWith('s1');
    expect(res).toEqual(out);
  });

  it('update delegates to service.update', async () => {
    const dto: UpdateStoreDto = { name: 'Updated' } as any;
    const updated = { id: 's1', name: 'Updated' } as any;
    (service.update as jest.Mock).mockResolvedValue(updated);

    const res = await controller.update('s1', dto);
    expect(service.update).toHaveBeenCalledWith('s1', dto);
    expect(res).toEqual(updated);
  });

  it('remove delegates to service.remove', async () => {
    (service.remove as jest.Mock).mockResolvedValue(undefined);
    const res = await controller.remove('s1');
    expect(service.remove).toHaveBeenCalledWith('s1');
    expect(res).toBeUndefined();
  });
});
