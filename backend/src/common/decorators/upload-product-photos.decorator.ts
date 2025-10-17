import { UseInterceptors, applyDecorators } from '@nestjs/common';
import { ApiConsumes, ApiBody } from '@nestjs/swagger';
import { PRODUCT_PHOTOS_MAX_COUNT } from 'src/modules/infrastructure/interceptors/product-photo/constants';
import { ProductPhotosInterceptor } from 'src/modules/infrastructure/interceptors/product-photo/product-photo.interceptor';

/**
 * Decorator to handle product photo uploads with Swagger documentation
 *
 * Supports:
 * - mainPhoto: Single main product photo (required)
 * - photos: Array of additional product photos (optional)
 *
 * @param maxCount Maximum number of additional photos allowed (default: from constants)
 *
 * @example
 * @Post()
 * @UploadProductPhotos(5)
 * async create(
 *   @UploadedFiles() files: { mainPhoto?: Express.Multer.File[], photos?: Express.Multer.File[] }
 * ) { ... }
 */
export function UploadProductPhotos(
  maxCount: number = PRODUCT_PHOTOS_MAX_COUNT
) {
  return applyDecorators(
    UseInterceptors(new ProductPhotosInterceptor(maxCount)),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          mainPhoto: {
            type: 'string',
            format: 'binary',
            description: 'Main product photo (single file)',
          },
          photos: {
            type: 'array',
            items: {
              type: 'string',
              format: 'binary',
            },
            description: `Additional product photos (max ${maxCount} files)`,
            maxItems: maxCount,
          },
        },
      },
    })
  );
}
