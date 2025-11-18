export interface AiGenerateOptions {
  maxTokens?: number;
  temperature?: number;
  model?: string;
  provider?: string;
  systemPrompt?: string;
  stop?: string[];
}

export interface ProductSpec {
  category?: string;
  features?: string[];
  price?: number;
  material?: string;
}

export interface GenerateNamesRequest {
  storeStyle: string;
  seed: string;
  count?: number;
  options?: AiGenerateOptions;
}

export interface GenerateDescriptionRequest {
  name: string;
  productSpec?: ProductSpec;
  tone?: 'professional' | 'casual' | 'enthusiastic' | string;
  options?: AiGenerateOptions;
}

export interface GenerateIdeasRequest {
  storeStyle: string;
  seed: string;
  count?: number;
  options?: AiGenerateOptions;
}

export interface GenerateCustomRequest {
  prompt: string;
  options?: AiGenerateOptions;
}

export interface GenerateImageRequest {
  prompt: string;
}

export interface GenerateResponse<T> {
  success: true;
  data: {
    result: T;
    metadata: {
      generatedAt: Date;
      userId: string;
      storeId: string;
      [key: string]: any;
    };
  };
}

export interface GeneratePostRequest {
  topic: string;
  tone?: string;
  length?: number;
  options?: AiGenerateOptions;
}

export interface UsageStats {
  total: number;
  byType: Record<string, number>;
  averageTokens: number;
}
