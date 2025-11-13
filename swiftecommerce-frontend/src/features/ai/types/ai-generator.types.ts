export interface GenerateNamesRequest {
  storeStyle: string;
  seed: string;
  count?: number;
}

export interface GenerateDescriptionRequest {
  name: string;
  productSpec?: string;
  tone?: 'professional' | 'casual' | 'enthusiastic';
}

export interface GenerateIdeasRequest {
  storeStyle: string;
  seed: string;
  count?: number;
}

export interface GenerateCustomRequest {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  context?: string;
}

export interface UsageStats {
  total: number;
  byType: Record<string, number>;
  averageTokens: number;
}
