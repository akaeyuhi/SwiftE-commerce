import {
  ExecutionContext,
  CallHandler,
  BadRequestException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { Request } from 'express';
import { of } from 'rxjs';
import * as multer from 'multer';
import { promises as fs } from 'fs';
import { ProductPhotosInterceptor } from 'src/modules/infrastructure/interceptors/product-photo/product-photo.interceptor';
import {
  PRODUCT_PHOTOS_FIELD,
  PRODUCT_PHOTOS_MAX_COUNT,
  UPLOADS_TMP_DIR,
} from 'src/modules/infrastructure/interceptors/product-photo/constants';
import { createMockExecutionContext } from 'test/unit/utils/helpers';
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    unlink: jest.fn(),
  },
}));

describe('ProductPhotosInterceptor', () => {
  let interceptor: ProductPhotosInterceptor;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let mockRequest: Partial<Request>;

  beforeEach(async () => {
    jest.clearAllMocks();

    interceptor = new ProductPhotosInterceptor();

    mockRequest = {
      method: 'POST',
      url: '/products',
      headers: {},
      body: {},
      files: [],
    };

    mockExecutionContext = createMockExecutionContext();

    // Mock call handler
    mockCallHandler = {
      handle: jest.fn().mockReturnValue(of({ success: true })),
    };

    // Mock fs.mkdir to resolve successfully
    (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Class instantiation', () => {
    it('should instantiate with default maxCount', () => {
      const instance = new ProductPhotosInterceptor();
      expect(instance).toBeDefined();
      expect(instance).toBeInstanceOf(ProductPhotosInterceptor);
    });

    it('should instantiate with custom maxCount', () => {
      const instance = new ProductPhotosInterceptor(5);
      expect(instance).toBeDefined();
      expect(instance).toBeInstanceOf(ProductPhotosInterceptor);
    });

    it('should create different instances with different configs', () => {
      const instance1 = new ProductPhotosInterceptor(2);
      const instance2 = new ProductPhotosInterceptor(5);

      expect(instance1).not.toBe(instance2);
      expect(instance1['maxCount']).toBe(2);
      expect(instance2['maxCount']).toBe(5);
    });

    it('should have correct default values', () => {
      const instance = new ProductPhotosInterceptor();

      expect(instance['fieldName']).toBe(PRODUCT_PHOTOS_FIELD);
      expect(instance['maxCount']).toBe(PRODUCT_PHOTOS_MAX_COUNT);
    });
  });

  describe('intercept()', () => {
    it('should call processUpload and continue to handler', async () => {
      const processUploadSpy = jest
        .spyOn(interceptor as any, 'processUpload')
        .mockResolvedValue(undefined);

      const result = await interceptor.intercept(
        mockExecutionContext,
        mockCallHandler
      );

      expect(processUploadSpy).toHaveBeenCalledWith(mockRequest);
      expect(mockCallHandler.handle).toHaveBeenCalled();

      // Result should be observable
      result.subscribe((data) => {
        expect(data).toEqual({ success: true });
      });
    });

    it('should propagate errors from processUpload', async () => {
      const error = new BadRequestException('Upload failed');
      jest.spyOn(interceptor as any, 'processUpload').mockRejectedValue(error);

      await expect(
        interceptor.intercept(mockExecutionContext, mockCallHandler)
      ).rejects.toThrow('Upload failed');

      expect(mockCallHandler.handle).not.toHaveBeenCalled();
    });
  });

  describe('fileFilter()', () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    let fileFilter: Function;

    beforeEach(() => {
      fileFilter = interceptor['fileFilter'].bind(interceptor);
    });

    it('should accept valid image files', () => {
      const validFiles = [
        { originalname: 'test.jpg', mimetype: 'image/jpeg' },
        { originalname: 'test.png', mimetype: 'image/png' },
        { originalname: 'test.gif', mimetype: 'image/gif' },
        { originalname: 'test.webp', mimetype: 'image/webp' },
      ];

      validFiles.forEach((file) => {
        const callback = jest.fn();
        fileFilter({} as Request, file as Express.Multer.File, callback);
        expect(callback).toHaveBeenCalledWith(null, true);
      });
    });

    it('should reject files with invalid MIME type', () => {
      const invalidFile = {
        originalname: 'document.pdf',
        mimetype: 'application/pdf',
      };

      const callback = jest.fn();
      fileFilter({} as Request, invalidFile as Express.Multer.File, callback);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Invalid file type'),
        })
      );
    });

    it('should reject files with invalid extension', () => {
      const invalidFile = {
        originalname: 'test.txt',
        mimetype: 'image/jpeg', // Mimetype says image but extension is .txt
      };

      const callback = jest.fn();
      fileFilter({} as Request, invalidFile as Express.Multer.File, callback);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Invalid file extension'),
        })
      );
    });

    it('should reject files without mimetype', () => {
      const invalidFile = {
        originalname: 'test.jpg',
        mimetype: null,
      };

      const callback = jest.fn();
      fileFilter(
        {} as Request,
        invalidFile as unknown as Express.Multer.File,
        callback
      );

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Invalid file type'),
        })
      );
    });

    it('should handle files with uppercase extensions', () => {
      const file = {
        originalname: 'test.JPG',
        mimetype: 'image/jpeg',
      };

      const callback = jest.fn();
      fileFilter({} as Request, file as Express.Multer.File, callback);

      expect(callback).toHaveBeenCalledWith(null, true);
    });
  });

  describe('handleMulterError()', () => {
    it('should handle LIMIT_FILE_SIZE error', () => {
      const multerError = new multer.MulterError('LIMIT_FILE_SIZE');
      const error = interceptor['handleMulterError'](multerError);

      expect(error).toBeInstanceOf(PayloadTooLargeException);
      expect(error.message).toContain('File size exceeds');
    });

    it('should handle LIMIT_FILE_COUNT error', () => {
      const multerError = new multer.MulterError('LIMIT_FILE_COUNT');
      const error = interceptor['handleMulterError'](multerError);

      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.message).toContain('Too many files');
    });

    it('should handle LIMIT_UNEXPECTED_FILE error', () => {
      const multerError = new multer.MulterError('LIMIT_UNEXPECTED_FILE');
      const error = interceptor['handleMulterError'](multerError);

      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.message).toContain('Unexpected field name');
    });

    it('should handle unknown multer errors', () => {
      const multerError = new multer.MulterError(
        'UNKNOWN_ERROR' as any,
        'custom'
      );
      const error = interceptor['handleMulterError'](multerError);

      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.message).toContain('File upload failed');
    });
  });

  describe('formatBytes()', () => {
    it('should format bytes correctly', () => {
      const testCases = [
        { bytes: 0, expected: '0 Bytes' },
        { bytes: 1024, expected: '1 KB' },
        { bytes: 1048576, expected: '1 MB' },
        { bytes: 1073741824, expected: '1 GB' },
        { bytes: 2500, expected: '2.44 KB' },
        { bytes: 5242880, expected: '5 MB' },
      ];

      testCases.forEach(({ bytes, expected }) => {
        const result = interceptor['formatBytes'](bytes);
        expect(result).toBe(expected);
      });
    });
  });

  describe('processUpload()', () => {
    it('should create temp directory if it does not exist', async () => {
      const processUpload = interceptor['processUpload'].bind(interceptor);

      // Mock multer to immediately call callback with no error
      const mockMulterArray = jest.fn((req, res, callback) => {
        callback(null);
      });

      jest
        .spyOn(interceptor['multerInstance'], 'array')
        .mockReturnValue(mockMulterArray as any);

      await processUpload(mockRequest as Request);

      expect(fs.mkdir).toHaveBeenCalledWith(UPLOADS_TMP_DIR, {
        recursive: true,
      });
    });

    it('should handle multer errors during upload', async () => {
      const processUpload = interceptor['processUpload'].bind(interceptor);
      const multerError = new multer.MulterError('LIMIT_FILE_SIZE');

      const mockMulterArray = jest.fn((req, res, callback) => {
        callback(multerError);
      });

      jest
        .spyOn(interceptor['multerInstance'], 'array')
        .mockReturnValue(mockMulterArray as any);

      await expect(processUpload(mockRequest as Request)).rejects.toThrow(
        PayloadTooLargeException
      );
    });

    it('should handle non-multer errors during upload', async () => {
      const processUpload = interceptor['processUpload'].bind(interceptor);
      const genericError = new Error('Generic upload error');

      const mockMulterArray = jest.fn((req, res, callback) => {
        callback(genericError);
      });

      jest
        .spyOn(interceptor['multerInstance'], 'array')
        .mockReturnValue(mockMulterArray as any);

      await expect(processUpload(mockRequest as Request)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('Integration', () => {
    it('should properly configure multer instance', () => {
      const instance = new ProductPhotosInterceptor(5);

      expect(instance['multerInstance']).toBeDefined();
      expect(instance['fieldName']).toBe(PRODUCT_PHOTOS_FIELD);
      expect(instance['maxCount']).toBe(5);
    });

    it('should use correct field name from constants', () => {
      const instance = new ProductPhotosInterceptor();
      expect(instance['fieldName']).toBe(PRODUCT_PHOTOS_FIELD);
    });

    it('should respect custom maxCount in multer configuration', () => {
      const customCount = 3;
      const instance = new ProductPhotosInterceptor(customCount);

      expect(instance['maxCount']).toBe(customCount);
    });
  });

  describe('Edge cases', () => {
    it('should handle zero maxCount', () => {
      const instance = new ProductPhotosInterceptor(0);
      expect(instance['maxCount']).toBe(0);
    });

    it('should handle very large maxCount', () => {
      const instance = new ProductPhotosInterceptor(1000);
      expect(instance['maxCount']).toBe(1000);
    });

    it('should handle files with no extension', () => {
      const fileFilter = interceptor['fileFilter'].bind(interceptor);
      const file = {
        originalname: 'noextension',
        mimetype: 'image/jpeg',
      };

      const callback = jest.fn();
      fileFilter({} as Request, file as Express.Multer.File, callback);

      // Should reject because extension validation will fail
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Invalid file extension'),
        })
      );
    });

    it('should handle files with multiple dots in name', () => {
      const fileFilter = interceptor['fileFilter'].bind(interceptor);
      const file = {
        originalname: 'my.file.name.jpg',
        mimetype: 'image/jpeg',
      };

      const callback = jest.fn();
      fileFilter({} as Request, file as Express.Multer.File, callback);

      expect(callback).toHaveBeenCalledWith(null, true);
    });
  });
});
