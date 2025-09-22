import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  PRODUCT_PHOTOS_FIELD,
  PRODUCT_PHOTOS_MAX_COUNT,
  PRODUCT_PHOTO_MAX_SIZE,
  UPLOADS_TMP_DIR,
} from 'src/modules/products/product-photo/interceptors/constants';
import { promises as fs } from 'fs';

/**
 * ProductPhotosInterceptor factory
 *
 * Returns a configured FilesInterceptor you can reuse on controller handlers:
 *
 * @example
 * @UseInterceptors(ProductPhotosInterceptor())
 * @Post()
 * async create(@UploadedFiles() photos: Express.Multer.File[]) { ... }
 *
 * This interceptor writes incoming files to a shared tmp folder (UPLOADS_TMP_DIR).
 * ProductPhotoService.saveFileAndCreatePhoto will move files to final per-store folders.
 *
 * We use a factory rather than a plain class here because Nest's FilesInterceptor
 * itself returns a dynamic interceptor class. This wrapper keeps configuration centralized.
 *
 * You can override maxCount by calling ProductPhotosInterceptor(5) etc.
 *
 * @param maxCount - maximum number of files to accept (default PRODUCT_PHOTOS_MAX_COUNT)
 */
export function ProductPhotosInterceptor(maxCount = PRODUCT_PHOTOS_MAX_COUNT) {
  return FilesInterceptor(PRODUCT_PHOTOS_FIELD, maxCount, {
    storage: diskStorage({
      destination: async (_req, _file, cb) => {
        // ensure temp dir exists
        await fs
          .mkdir(UPLOADS_TMP_DIR, { recursive: true })
          .catch(() => undefined);
        cb(null, UPLOADS_TMP_DIR);
      },
      filename: (_req, file, cb) => {
        const ext = extname(file.originalname) || '';
        cb(null, `${Date.now()}-${uuidv4()}${ext}`);
      },
    }),
    limits: {
      fileSize: PRODUCT_PHOTO_MAX_SIZE,
    },
    // NOTE: don't perform heavy validation here (e.g. virus scan); do quick checks only
    fileFilter: (_req, file, cb) => {
      // Optional lightweight check: only allow images
      // If you want stricter checks, move them to service with MIME sniffing or image parsing.
      if (file.mimetype && file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(null, false);
      }
    },
  });
}
