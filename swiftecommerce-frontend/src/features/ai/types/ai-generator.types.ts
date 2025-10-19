export interface GenerateNamesRequest {
  category: string;
  keywords: string[];
  count?: number;
}

export interface GenerateDescriptionRequest {
  name: string;
  productSpec: string;
  tone?: 'professional' | 'casual' | 'enthusiastic';
}

export interface GenerateIdeasRequest {
  category: string;
  trends: string[];
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
