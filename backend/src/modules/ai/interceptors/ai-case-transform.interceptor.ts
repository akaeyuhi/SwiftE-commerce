import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CaseTransformer } from 'src/common/utils/case-transformer.util';

/**
 * AI Case Transform Interceptor
 *
 * Automatically transforms:
 * - Request bodies: camelCase → snake_case (for AI providers)
 * - Response bodies: snake_case → camelCase (from AI providers)
 *
 * @example
 * @UseInterceptors(AiCaseTransformInterceptor)
 * @Post('generate')
 * async generate(@Body() dto: GenerateDto) {
 *   // dto keys are in camelCase
 *   // sent to AI provider as snake_case
 *   // response transformed back to camelCase
 * }
 */
@Injectable()
export class AiCaseTransformInterceptor implements NestInterceptor {
  private readonly excludedKeys: string[] = [
    // Keys that should not be transformed
    'id',
    'createdAt',
    'updatedAt',
    'metadata',
  ];

  constructor(excludedKeys?: string[]) {
    if (excludedKeys) {
      this.excludedKeys = [...this.excludedKeys, ...excludedKeys];
    }
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    if (request.query && typeof request.query === 'object') {
      const transformedQuery =
        CaseTransformer.transformKeysToSnakeWithExclusions(
          request.query,
          this.excludedKeys
        );

      // Clear existing properties
      Object.keys(request.query).forEach((key) => {
        delete request.query[key];
      });

      // Add transformed properties
      Object.assign(request.query, transformedQuery);
    }

    // Transform response back to camelCase
    return next.handle().pipe(
      map((data) => {
        if (data && typeof data === 'object') {
          return CaseTransformer.transformKeysToCamelWithExclusions(
            data,
            this.excludedKeys
          );
        }
        return data;
      })
    );
  }
}

/**
 * Factory function to create interceptor with custom exclusions
 */
export function createAiCaseTransformInterceptor(
  excludedKeys?: string[]
): AiCaseTransformInterceptor {
  return new AiCaseTransformInterceptor(excludedKeys);
}
