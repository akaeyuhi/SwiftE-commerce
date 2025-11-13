import { UseInterceptors, applyDecorators } from '@nestjs/common';
import { ApiConsumes, ApiBody } from '@nestjs/swagger';
import { AvatarInterceptor } from 'src/modules/infrastructure/interceptors/avatar/avatar.interceptor';

export function UploadAvatar() {
  return applyDecorators(
    UseInterceptors(new AvatarInterceptor()),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          avatar: {
            type: 'string',
            format: 'binary',
            description: 'User avatar (single file)',
          },
        },
      },
    })
  );
}
