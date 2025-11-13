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

export const AVATAR_FIELD = 'avatar';
export const AVATAR_FILE_MAX_SIZE = 1024 * 1024 * 2; // 2MB
export const UPLOADS_TMP_DIR = './uploads/tmp';

@Injectable()
export class AvatarInterceptor implements NestInterceptor {
  private readonly multerInstance: multer.Multer;

  constructor() {
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
        fileSize: AVATAR_FILE_MAX_SIZE,
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
      const upload = this.multerInstance.single(AVATAR_FIELD);

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
          resolve();
        }
      });
    });
  }

  private fileFilter(
    _req: Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
  ): void {
    if (file.fieldname !== AVATAR_FIELD) {
      cb(
        new BadRequestException(
          `Invalid field name '${file.fieldname}'. Expected: '${AVATAR_FIELD}'`
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
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

    if (!allowedExtensions.includes(ext)) {
      cb(
        new BadRequestException(
          `Invalid file extension for ${file.originalname}. Allowed: ${allowedExtensions.join(', ')}`
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
          `File size exceeds the maximum allowed size of ${this.formatBytes(AVATAR_FILE_MAX_SIZE)}`
        );
      case 'LIMIT_UNEXPECTED_FILE':
        return new BadRequestException(
          `Unexpected field name. Expected: '${AVATAR_FIELD}'`
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
