import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesService } from 'src/modules/store/categories/categories.service';
import { CategoriesRepository } from 'src/modules/store/categories/categories.repository';
import { Category } from 'src/entities/store/product/category.entity';
import { CreateCategoryDto } from 'src/modules/store/categories/dto/create-category.dto';
import { UpdateCategoryDto } from 'src/modules/store/categories/dto/update-category.dto';
import { createRepositoryMock, MockedMethods } from 'test/unit/utils/helpers';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let repo: Partial<MockedMethods<CategoriesRepository>>;

  const rootCategory: Category = {
    id: 'c1',
    name: 'Root',
    description: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;
  const childCategory: Category = {
    id: 'c2',
    name: 'Child',
    description: '',
    parent: { id: 'c1' } as any,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

  beforeEach(async () => {
    repo = createRepositoryMock<CategoriesRepository>([
      'findById',
      'createEntity',
      'findAllWithRelations',
      'findWithChildren',
      'save',
    ]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: CategoriesRepository, useValue: repo },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates root category when no parentId', async () => {
      const dto: CreateCategoryDto = { name: 'New', description: 'Desc' };
      const created = {
        id: 'new',
        name: dto.name,
        description: dto.description,
      } as Category;
      repo.createEntity!.mockResolvedValue(created);

      const res = await service.create(dto);
      expect(repo.createEntity).toHaveBeenCalledWith({
        name: dto.name,
        description: dto.description,
      });
      expect(res).toEqual(created);
    });

    it('throws NotFoundException if parent not found', async () => {
      const dto: CreateCategoryDto = {
        name: 'New',
        description: '',
        parentId: 'missing',
      };
      repo.findById!.mockResolvedValue(null);

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
      expect(repo.findById).toHaveBeenCalledWith('missing');
    });

    it('creates child when parent exists', async () => {
      const dto: CreateCategoryDto = {
        name: 'Child',
        description: '',
        parentId: 'c1',
      };
      repo.findById!.mockResolvedValue(rootCategory);
      const created = {
        id: 'c2',
        name: 'Child',
        parent: { id: 'c1' },
      } as Category;
      repo.createEntity!.mockResolvedValue(created);

      const res = await service.create(dto);
      expect(repo.createEntity).toHaveBeenCalledWith({
        name: dto.name,
        description: dto.description,
        parent: { id: 'c1' },
      });
      expect(res).toEqual(created);
    });
  });

  describe('update', () => {
    it('throws NotFoundException if category missing', async () => {
      const dto: UpdateCategoryDto = { name: 'X' };
      repo.findById!.mockResolvedValue(null);

      await expect(service.update('missing', dto)).rejects.toThrow(
        NotFoundException
      );
    });

    it('throws BadRequestException when parentId equals id', async () => {
      const dto: UpdateCategoryDto = { parentId: 'c1' };
      repo.findById!.mockResolvedValue(rootCategory);

      await expect(service.update('c1', dto)).rejects.toThrow(
        BadRequestException
      );
    });

    it('clears parent when parentId null', async () => {
      const dto: UpdateCategoryDto = { parentId: null as unknown as string };
      const existing = { ...childCategory } as any;
      repo.findById!.mockResolvedValue(existing);
      const saved = { ...existing, parent: undefined };
      repo.save!.mockResolvedValue(saved);

      const res = await service.update('c2', dto);
      expect(existing.parent).toBeUndefined();
      expect(repo.save).toHaveBeenCalledWith(existing);
      expect(res).toEqual(saved);
    });

    it('throws NotFoundException when new parent not found', async () => {
      const dto: UpdateCategoryDto = { parentId: 'missing' };
      repo.findById!.mockResolvedValue(rootCategory);
      repo
        .findById!.mockResolvedValueOnce(rootCategory)
        .mockResolvedValueOnce(null);

      await expect(service.update('c1', dto)).rejects.toThrow(
        NotFoundException
      );
    });

    it('updates name and description', async () => {
      const dto: UpdateCategoryDto = {
        name: 'Updated',
        description: 'NewDesc',
      };
      const existing = { ...rootCategory } as any;
      repo.findById!.mockResolvedValue(existing);
      const saved = {
        ...existing,
        name: dto.name,
        description: dto.description,
      };
      repo.save!.mockResolvedValue(saved);

      const res = await service.update('c1', dto);
      expect(existing.name).toBe(dto.name);
      expect(existing.description).toBe(dto.description);
      expect(repo.save).toHaveBeenCalledWith(existing);
      expect(res).toEqual(saved);
    });
  });

  describe('findWithChildren', () => {
    it('delegates to repository.findWithChildren', async () => {
      repo.findWithChildren!.mockResolvedValue(childCategory);
      const res = await service.findWithChildren('c2');
      expect(repo.findWithChildren).toHaveBeenCalledWith('c2');
      expect(res).toEqual(childCategory);
    });
  });

  describe('getTree', () => {
    it('builds tree from flat list', async () => {
      repo.findAllWithRelations!.mockResolvedValue([
        rootCategory,
        childCategory,
      ]);
      const tree = await service.getTree();
      expect(tree).toHaveLength(1);
      expect(tree[0].id).toBe('c1');
      expect((tree[0] as any).children[0].id).toBe('c2');
    });

    it('handles multiple roots', async () => {
      const anotherRoot = {
        id: 'c3',
        name: 'Root2',
        description: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;
      repo.findAllWithRelations!.mockResolvedValue([rootCategory, anotherRoot]);
      const tree = await service.getTree();
      expect(tree.map((c) => c.id).sort()).toEqual(['c1', 'c3']);
    });

    it('handles missing parent links', async () => {
      const orphan = {
        id: 'o1',
        name: 'Orphan',
        description: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;
      repo.findAllWithRelations!.mockResolvedValue([childCategory, orphan]);
      const tree = await service.getTree();
      expect(tree.map((c) => c.id).sort()).toEqual(['c2', 'o1']);
    });
  });
});
