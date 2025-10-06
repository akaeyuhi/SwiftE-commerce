import { AiGenerateOptions } from 'src/common/interfaces/ai/generator.interface';

export interface GenerationRequest {
  type: 'name' | 'description' | 'ideas' | 'custom';
  prompt: string;
  options: AiGenerateOptions;
  context?: {
    storeStyle?: string;
    productSpec?: string;
    tone?: string;
    seed?: string;
    count?: number;
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
  productSpec?: string;
  tone?: string;
}

export type IdeasGenerationParams = NameGenerationParams;
export interface CustomGenerationParams extends GenerationParams {
  prompt: string;
}

export interface HealthCheckResult {
  healthy: boolean;
  provider: any;
  rateLimiter: any;
  lastError?: string;
}
