import { UseInterceptors, applyDecorators } from '@nestjs/common';
import { ApiConsumes, ApiBody } from '@nestjs/swagger';
import { StoreFilesInterceptor } from 'src/modules/infrastructure/interceptors/store-files/store-files.interceptor';

export function UploadStoreFiles() {
  return applyDecorators(
    UseInterceptors(new StoreFilesInterceptor()),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          logo: {
            type: 'string',
            format: 'binary',
            description: 'Store logo (single file)',
          },
          banner: {
            type: 'string',
            format: 'binary',
            description: 'Store banner (single file)',
          },
        },
      },
    })
  );
}
