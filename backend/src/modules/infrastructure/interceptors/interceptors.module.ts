import { Global, Module } from '@nestjs/common';
import { RecordEventInterceptor } from 'src/modules/infrastructure/interceptors/record-event/record-event.interceptor';
import { ProductPhotosInterceptor } from 'src/modules/infrastructure/interceptors/product-photo/product-photo.interceptor';

/**
 * InterceptorsModule (Global)
 *
 * Provides global interceptors that can be used anywhere.
 */
@Global()
@Module({
  providers: [RecordEventInterceptor, ProductPhotosInterceptor],
  exports: [RecordEventInterceptor, ProductPhotosInterceptor],
})
export class InterceptorsModule {}
