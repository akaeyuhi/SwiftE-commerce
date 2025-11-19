import { AiGenerateOptions } from 'src/common/interfaces/ai/generator.interface';
import { ProductSpecDto } from 'src/modules/ai/ai-generator/dto/generator-request.dto';

export interface GenerationRequest {
  type: 'name' | 'description' | 'ideas' | 'custom' | 'image' | 'post';
  prompt: string;
  options: AiGenerateOptions;
  context?: {
    storeStyle?: string;
    productSpec?: ProductSpecDto;
    tone?: string;
    seed?: string;
    productName?: string;
    count?: number;
    topic?: string;
    length?: number;
  };
}

export interface GenerationResponse {
  type: string;
  result: any;
  raw: string;
  metadata: {
    processingTime: number;
    tokensUsed: number;
    cost?: number;
  };
}

export interface GenerationType {
  type: string;
  description: string;
  defaultOptions: AiGenerateOptions;
}

export interface GenerationParams {
  options?: AiGenerateOptions;
  userId?: string;
  storeId?: string;
}

export interface NameGenerationParams extends GenerationParams {
  storeStyle?: string;
  seed?: string;
  count?: number;
}
export interface DescriptionGenerationParams extends GenerationParams {
  name: string;
  productSpec?: ProductSpecDto;
  tone?: string;
}

export type IdeasGenerationParams = NameGenerationParams;
export interface CustomGenerationParams extends GenerationParams {
  prompt: string;
}

export interface PostGenerationParams extends GenerationParams {
  topic: string;
  tone?: string;
  length?: number;
}

export interface GenerationResult<T> {
  success: boolean;
  data: {
    result: T;
    metadata: {
      count?: number;
      storeStyle?: string;
      seed?: string;
      generatedAt?: string;
      userId?: string;
      storeId?: string;
    };
  };
}

export interface HealthCheckResult {
  healthy: boolean;
  provider: any;
  rateLimiter: any;
  lastError?: string;
}
