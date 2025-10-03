import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';
import * as multer from 'multer';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { promises as fs } from 'fs';
import {
  PRODUCT_PHOTOS_FIELD,
  PRODUCT_PHOTOS_MAX_COUNT,
  PRODUCT_PHOTO_MAX_SIZE,
  UPLOADS_TMP_DIR,
} from './constants';

/**
 * ProductPhotosInterceptor
 *
 * Interceptor for handling multiple product photo uploads.
 * Extends NestInterceptor to provide proper integration with NestJS.
 *
 * Features:
 * - Configurable max file count
 * - Automatic temp directory creation
 * - File size limits
 * - Image type validation
 * - UUID-based unique filenames
 *
 * @example
 * // Default usage (max 10 files)
 * @UseInterceptors(ProductPhotosInterceptor)
 * @Post()
 * async create(@UploadedFiles() photos: Express.Multer.File[]) { ... }
 *
 * // Custom max count
 * @UseInterceptors(new ProductPhotosInterceptor(5))
 * @Post()
 * async create(@UploadedFiles() photos: Express.Multer.File[]) { ... }
 */
@Injectable()
export class ProductPhotosInterceptor implements NestInterceptor {
  private readonly multerInstance: multer.Multer;
  private readonly fieldName: string = PRODUCT_PHOTOS_FIELD;
  private readonly maxCount: number;

  constructor(maxCount: number = PRODUCT_PHOTOS_MAX_COUNT) {
    this.maxCount = maxCount;

    // Configure multer with storage, limits, and filters
    this.multerInstance = multer({
      storage: diskStorage({
        destination: async (_req, _file, cb) => {
          try {
            // Ensure temp directory exists
            await fs.mkdir(UPLOADS_TMP_DIR, { recursive: true });
            cb(null, UPLOADS_TMP_DIR);
          } catch (error) {
            cb(error as Error, UPLOADS_TMP_DIR);
          }
        },
        filename: (_req, file, cb) => {
          // Generate unique filename: timestamp-uuid.ext
          const ext = extname(file.originalname) || '';
          const filename = `${Date.now()}-${uuidv4()}${ext}`;
          cb(null, filename);
        },
      }),
      limits: {
        fileSize: PRODUCT_PHOTO_MAX_SIZE,
        files: this.maxCount,
      },
      fileFilter: this.fileFilter.bind(this),
    });
  }

  async intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest<Request>();

    // Process the multipart/form-data upload
    await this.processUpload(request);

    // Continue to the route handler
    return next.handle();
  }

  /**
   * Process file upload using multer
   */
  private processUpload(request: Request): Promise<void> {
    return new Promise((resolve, reject) => {
      const upload = this.multerInstance.array(this.fieldName, this.maxCount);

      upload(request as any, {} as any, (error: any) => {
        if (error) {
          // Handle multer-specific errors
          if (error instanceof multer.MulterError) {
            reject(this.handleMulterError(error));
          } else {
            // Handle other errors (e.g., file filter rejection)
            reject(
              new BadRequestException(error.message || 'File upload failed')
            );
          }
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * File filter to validate uploaded files
   */
  private fileFilter(
    _req: Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
  ): void {
    // Validate file is an image
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      cb(
        new BadRequestException(
          `Invalid file type for ${file.originalname}. Only images are allowed.`
        )
      );
      return;
    }

    // Additional validation: check file extension
    const ext = extname(file.originalname).toLowerCase();
    const allowedExtensions = [
      '.jpg',
      '.jpeg',
      '.png',
      '.gif',
      '.webp',
      '.svg',
    ];

    if (!allowedExtensions.includes(ext)) {
      cb(
        new BadRequestException(
          `Invalid file extension for ${file.originalname}. Allowed: ${allowedExtensions.join(', ')}`
        )
      );
      return;
    }

    // File is valid
    cb(null, true);
  }

  /**
   * Handle multer-specific errors
   */
  private handleMulterError(error: multer.MulterError): Error {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return new PayloadTooLargeException(
          `File size exceeds the maximum allowed size of ${this.formatBytes(PRODUCT_PHOTO_MAX_SIZE)}`
        );

      case 'LIMIT_FILE_COUNT':
        return new BadRequestException(
          `Too many files. Maximum allowed: ${this.maxCount}`
        );

      case 'LIMIT_UNEXPECTED_FILE':
        return new BadRequestException(
          `Unexpected field name. Expected: ${this.fieldName}`
        );

      default:
        return new BadRequestException(error.message || 'File upload failed');
    }
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}

/**
 * Factory function for backward compatibility
 *
 * @deprecated Use the class directly: @UseInterceptors(ProductPhotosInterceptor)
 * or with custom count: @UseInterceptors(new ProductPhotosInterceptor(5))
 */
export function createProductPhotosInterceptor(
  maxCount: number = PRODUCT_PHOTOS_MAX_COUNT
) {
  return new ProductPhotosInterceptor(maxCount);
}
