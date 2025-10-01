import { UseInterceptors, applyDecorators } from '@nestjs/common';
import { ApiConsumes, ApiBody } from '@nestjs/swagger';
import { PRODUCT_PHOTOS_MAX_COUNT } from 'src/modules/infrastructure/interceptors/product-photo/constants';
import { ProductPhotosInterceptor } from 'src/modules/infrastructure/interceptors/product-photo/product-photo.interceptor';

/**
 * Decorator to handle product photo uploads with Swagger documentation
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
          photos: {
            type: 'array',
            items: {
              type: 'string',
              format: 'binary',
            },
            maxItems: maxCount,
          },
        },
      },
    })
  );
}
