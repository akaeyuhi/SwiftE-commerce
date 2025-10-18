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
  PRODUCT_MAIN_PHOTO_FIELD,
} from './constants';

/**
 * ProductPhotosInterceptor
 *
 * Interceptor for handling product photo uploads with support for:
 * - Multiple photos array field
 * - Single main photo field
 *
 * Features:
 * - Configurable max file count for array
 * - Automatic temp directory creation
 * - File size limits
 * - Image type validation
 * - UUID-based unique filenames
 *
 * @example
 * // Handle both photos[] and mainPhoto
 * @UseInterceptors(ProductPhotosInterceptor)
 * @Post()
 * async create(
 *   @UploadedFiles() files: { photos?: Express.Multer.File[], mainPhoto?: Express.Multer.File[] }
 * ) {
 *   const mainPhoto = files.mainPhoto?.[0]; // Single file
 *   const additionalPhotos = files.photos || []; // Array of files
 * }
 *
 * // Custom max count for photos array
 * @UseInterceptors(new ProductPhotosInterceptor(5))
 * @Post()
 * async create(@UploadedFiles() files) { ... }
 */
@Injectable()
export class ProductPhotosInterceptor implements NestInterceptor {
  private readonly multerInstance: multer.Multer;
  private readonly photosFieldName: string = PRODUCT_PHOTOS_FIELD;
  private readonly mainPhotoFieldName: string = PRODUCT_MAIN_PHOTO_FIELD;
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
        files: this.maxCount + 1, // +1 for mainPhoto
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
   * Process file upload using multer with multiple fields
   */
  private processUpload(request: Request): Promise<void> {
    return new Promise((resolve, reject) => {
      // Configure fields: photos (array) and mainPhoto (single)
      const upload = this.multerInstance.fields([
        { name: this.photosFieldName, maxCount: this.maxCount }, // photos[]
        { name: this.mainPhotoFieldName, maxCount: 1 }, // mainPhoto (single)
      ]);

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
          // Validate uploaded files
          this.validateUploadedFiles(request);
          resolve();
        }
      });
    });
  }

  /**
   * Validate uploaded files structure
   */
  private validateUploadedFiles(request: Request): void {
    const files = (request as any).files as {
      [fieldname: string]: Express.Multer.File[];
    };

    if (!files) {
      return; // No files uploaded - this is okay, let the route handler validate
    }

    // Validate photos array count
    const photos = files[this.photosFieldName];
    if (photos && photos.length > this.maxCount) {
      throw new BadRequestException(
        `Too many photos. Maximum allowed: ${this.maxCount}`
      );
    }

    // Validate mainPhoto is single file
    const mainPhoto = files[this.mainPhotoFieldName];
    if (mainPhoto && mainPhoto.length > 1) {
      throw new BadRequestException('Only one main photo is allowed');
    }
  }

  /**
   * File filter to validate uploaded files
   */
  private fileFilter(
    _req: Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
  ): void {
    // Validate field name
    if (
      file.fieldname !== this.photosFieldName &&
      file.fieldname !== this.mainPhotoFieldName
    ) {
      cb(
        new BadRequestException(
          `Invalid field name '${file.fieldname}'. Expected: '${this.photosFieldName}' or '${this.mainPhotoFieldName}'`
        )
      );
      return;
    }

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
          `Too many files. Maximum allowed: ${this.maxCount} photos + 1 main photo`
        );

      case 'LIMIT_UNEXPECTED_FILE':
        return new BadRequestException(
          `Unexpected field name. Expected: '${this.photosFieldName}' (array) or '${this.mainPhotoFieldName}' (single)`
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
