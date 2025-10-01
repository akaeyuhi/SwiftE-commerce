export interface AiGenerateOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  stop?: string[] | string;
  [key: string]: any;
}

export interface AiGenerateResult {
  text: string;
  raw?: any;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    cost?: number;
  };
}

/**
 * AiProvider - single interface each provider must implement.
 * This lets the application switch LLM backends by changing DI configuration.
 */
export interface AiProvider {
  /**
   * Generate text using the backend LLM.
   * @param prompt - plain text prompt (provider implementations may wrap/convert it)
   * @param options - generation options (temperature, model, maxTokens etc.)
   */
  generate(
    prompt: string,
    options?: AiGenerateOptions
  ): Promise<AiGenerateResult>;
}
