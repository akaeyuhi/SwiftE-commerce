import {
  AiGenerateOptions,
  AiGenerateResult,
} from 'src/common/interfaces/ai/generator.interface';

export interface AiServiceRequest<Data = any> {
  feature: string;
  provider?: string;
  model?: string;
  prompt?: string;
  data: Data;
  userId?: string;
  storeId?: string;
  options?: AiGenerateOptions;
  metadata?: Record<string, any>;
}

export interface AiServiceResponse<Result = any> extends AiGenerateResult {
  metadata?: any;
  success: boolean;
  result?: Result;
  error?: string;
  feature: string;
  provider: string;
  model?: string;
}
