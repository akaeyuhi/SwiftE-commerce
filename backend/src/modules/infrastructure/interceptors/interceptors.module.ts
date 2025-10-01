import { Global, Module } from '@nestjs/common';
import { RecordEventInterceptor } from 'src/modules/infrastructure/interceptors/record-event/record-event.interceptor';

/**
 * InterceptorsModule (Global)
 *
 * Provides global interceptors that can be used anywhere.
 */
@Global()
@Module({
  providers: [RecordEventInterceptor],
  exports: [RecordEventInterceptor],
})
export class InterceptorsModule {}
