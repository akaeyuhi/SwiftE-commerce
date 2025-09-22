import { IsOptional, IsString, IsUUID, IsObject } from 'class-validator';

/**
 * DTO: CreateAiLogDto
 *
 * Fields:
 * - userId: optional UUID of user who triggered the AI feature (if omitted, controller may fill from req.user)
 * - storeId: optional UUID of the store context
 * - feature: e.g. 'predictor', 'generator-name', 'generator-idea'
 * - prompt: optional prompt text used for generation (will be stored inside details.prompt)
 * - details: optional arbitrary JSON with provider response or additional metadata
 */
export class CreateAiLogDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsUUID()
  storeId?: string;

  @IsString()
  feature: string;

  @IsOptional()
  @IsString()
  prompt?: string;

  @IsOptional()
  @IsObject()
  details?: Record<string, any>;
}
