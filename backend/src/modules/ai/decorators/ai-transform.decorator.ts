import { UseInterceptors } from '@nestjs/common';
import { AiCaseTransformInterceptor } from '../interceptors/ai-case-transform.interceptor';

/**
 * Decorator to apply AI case transformation
 *
 * @param excludedKeys - Keys to exclude from transformation
 *
 * @example
 * @AiTransform()
 * @Post('generate')
 * async generate(@Body() dto: GenerateDto) { }
 *
 * @example
 * @AiTransform(['custom_field', 'api_key'])
 * @Post('generate')
 * async generate(@Body() dto: GenerateDto) { }
 */
export const AiTransform = (excludedKeys?: string[]) =>
  UseInterceptors(new AiCaseTransformInterceptor(excludedKeys));
