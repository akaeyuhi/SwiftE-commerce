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
  NEWS_PHOTOS_FIELD,
  NEWS_PHOTOS_MAX_COUNT,
  NEWS_PHOTO_MAX_SIZE,
  UPLOADS_TMP_DIR,
  NEWS_MAIN_PHOTO_FIELD,
} from './constants';

@Injectable()
export class NewsFilesInterceptor implements NestInterceptor {
  private readonly multerInstance: multer.Multer;
  private readonly photosFieldName: string = NEWS_PHOTOS_FIELD;
  private readonly mainPhotoFieldName: string = NEWS_MAIN_PHOTO_FIELD;
  private readonly maxCount: number;

  constructor(maxCount: number = NEWS_PHOTOS_MAX_COUNT) {
    this.maxCount = maxCount;

    this.multerInstance = multer({
      storage: diskStorage({
        destination: async (_req, _file, cb) => {
          try {
            await fs.mkdir(UPLOADS_TMP_DIR, { recursive: true });
            cb(null, UPLOADS_TMP_DIR);
          } catch (error) {
            cb(error as Error, UPLOADS_TMP_DIR);
          }
        },
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname) || '';
          const filename = `${Date.now()}-${uuidv4()}${ext}`;
          cb(null, filename);
        },
      }),
      limits: {
        fileSize: NEWS_PHOTO_MAX_SIZE,
        files: this.maxCount + 1,
      },
      fileFilter: this.fileFilter.bind(this),
    });
  }

  async intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest<Request>();

    await this.processUpload(request);

    return next.handle();
  }

  private processUpload(request: Request): Promise<void> {
    return new Promise((resolve, reject) => {
      const upload = this.multerInstance.fields([
        { name: this.photosFieldName, maxCount: this.maxCount },
        { name: this.mainPhotoFieldName, maxCount: 1 },
      ]);

      upload(request as any, {} as any, (error: any) => {
        if (error) {
          if (error instanceof multer.MulterError) {
            reject(this.handleMulterError(error));
          } else {
            reject(
              new BadRequestException(error.message || 'File upload failed')
            );
          }
        } else {
          this.validateUploadedFiles(request);
          resolve();
        }
      });
    });
  }

  private validateUploadedFiles(request: Request): void {
    const files = (request as any).files as {
      [fieldname: string]: Express.Multer.File[];
    };

    if (!files) {
      return;
    }

    const photos = files[this.photosFieldName];
    if (photos && photos.length > this.maxCount) {
      throw new BadRequestException(
        `Too many photos. Maximum allowed: ${this.maxCount}`
      );
    }

    const mainPhoto = files[this.mainPhotoFieldName];
    if (mainPhoto && mainPhoto.length > 1) {
      throw new BadRequestException('Only one main photo is allowed');
    }
  }

  private fileFilter(
    _req: Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
  ): void {
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

    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      cb(
        new BadRequestException(
          `Invalid file type for ${file.originalname}. Only images are allowed.`
        )
      );
      return;
    }

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
          `Invalid file extension for ${file.originalname}. Allowed: ${allowedExtensions.join(
            ', '
          )}`
        )
      );
      return;
    }

    cb(null, true);
  }

  private handleMulterError(error: multer.MulterError): Error {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return new PayloadTooLargeException(
          `File size exceeds the maximum allowed size of ${this.formatBytes(
            NEWS_PHOTO_MAX_SIZE
          )}`
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

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}

export function createNewsFilesInterceptor(
  maxCount: number = NEWS_PHOTOS_MAX_COUNT
) {
  return new NewsFilesInterceptor(maxCount);
}
