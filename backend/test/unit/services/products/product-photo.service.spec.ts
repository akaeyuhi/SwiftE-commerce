import { Test } from '@nestjs/testing';
import { ProductPhotoService } from 'src/modules/products/product-photo/product-photo.service';
import { ProductPhotoRepository } from 'src/modules/products/product-photo/product-photo.repository';
import { createRepositoryMock, MockedMethods } from 'test/utils/helpers';
import { BadRequestException } from '@nestjs/common';
import { promises as fs } from 'fs';
import { Store } from 'src/entities/store/store.entity';
import { Product } from 'src/entities/store/product/product.entity';
import { ProductPhoto } from 'src/entities/store/product/product-photo.entity';

jest.mock(
  'src/modules/products/product-photo/product-photo.repository',
  () => ({
    ProductPhotoRepository: class {},
  })
);

jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    writeFile: jest.fn(),
    rename: jest.fn(),
    readFile: jest.fn(),
    unlink: jest.fn(),
  },
}));

describe('ProductPhotoService', () => {
  let svc: ProductPhotoService;
  let repo: Partial<MockedMethods<ProductPhotoRepository>>;

  const file: any = {
    mimetype: 'image/png',
    originalname: 'pic.png',
    buffer: Buffer.from(''),
  };
  const store: Store = { id: 's1' } as Store;
  const product: Product = {
    id: 'p1',
    photos: [{ id: 'old', isMain: true }] as ProductPhoto[],
  } as Product;

  beforeEach(async () => {
    repo = createRepositoryMock<ProductPhotoRepository>([
      'createEntity',
      'save',
      'updateEntity',
      'findById',
      'deleteById',
    ]);
    const mod = await Test.createTestingModule({
      providers: [
        ProductPhotoService,
        { provide: ProductPhotoRepository, useValue: repo },
      ],
    }).compile();
    svc = mod.get<ProductPhotoService>(ProductPhotoService);
    jest.clearAllMocks();
  });

  describe('saveFileToStore', () => {
    it('throws on bad mimetype', async () => {
      await expect(
        (svc as any).saveFileToStore(
          { mimetype: 'text/plain', originalname: 'a.txt' } as any,
          's1'
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('writes buffer to disk', async () => {
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
      const url = await (svc as any).saveFileToStore(file, 's1');
      expect(fs.mkdir).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalled();
      expect(url).toMatch(/\/uploads\/products\/s1\//);
    });
  });

  describe('saveFileAndCreatePhoto', () => {
    it('unsets old main and creates new photo', async () => {
      (svc as any).saveFileToStore = jest.fn().mockResolvedValue('/url');
      repo.updateEntity!.mockResolvedValue(undefined as any);
      repo.createEntity!.mockResolvedValue({ id: 'new', isMain: true } as any);
      const res = await (svc as any).saveFileAndCreatePhoto(
        file,
        store,
        product,
        'alt',
        true
      );
      expect(repo.updateEntity).toHaveBeenCalledWith('old', { isMain: false });
      expect(repo.createEntity).toHaveBeenCalledWith({
        product,
        url: '/url',
        altText: 'alt',
        isMain: true,
      });
      expect(res.id).toBe('new');
    });
  });

  describe('deletePhotoAndFile', () => {
    it('deletes DB row and unlinks file', async () => {
      repo.findById!.mockResolvedValue({
        id: 'p',
        url: '/uploads/products/s1/f.png',
      } as any);
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);
      await svc.deletePhotoAndFile('p');
      expect(repo.deleteById).toHaveBeenCalledWith('p');
      expect(fs.unlink).toHaveBeenCalled();
    });

    it('no-op if missing', async () => {
      repo.findById!.mockResolvedValue(null);
      await expect(svc.deletePhotoAndFile('x')).resolves.toBeUndefined();
    });
  });

  describe('addPhotos', () => {
    it('returns null when no files', async () => {
      const res = await svc.addPhotos(product, store, [], true);
      expect(res).toBeNull();
    });

    it('saves multiple photos', async () => {
      (svc as any).saveFileAndCreatePhoto = jest
        .fn()
        .mockResolvedValue({ id: 'p' } as any);
      const res = await svc.addPhotos(product, store, [file, file], true);
      expect((svc as any).saveFileAndCreatePhoto).toHaveBeenCalledTimes(2);
      expect(res).toEqual([{ id: 'p' }, { id: 'p' }]);
    });
  });

  describe('getProductMainPhoto', () => {
    it('throws if no main', () => {
      expect(() => (svc as any).getProductMainPhoto({ photos: [] })).toThrow(
        BadRequestException
      );
    });
  });
});
