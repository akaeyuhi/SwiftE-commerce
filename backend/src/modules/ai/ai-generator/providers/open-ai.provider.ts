import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import {
  AiProvider,
  AiGenerateOptions,
  AiGenerateResult,
} from 'src/common/interfaces/ai.interface';

/**
 * OpenAiProvider (Chat Completions)
 *
 * Uses the OpenAI Chat Completions endpoint. Set OPENAI_API_KEY env var.
 * Note: this is an example; adapt model and fields to your account.
 */
@Injectable()
export class OpenAiProvider implements AiProvider {
  private readonly logger = new Logger(OpenAiProvider.name);
  private readonly apiKey?: string;
  private readonly baseUrl: string;
  private readonly defaultModel: string;

  constructor(private readonly httpService: HttpService) {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.baseUrl = process.env.OPENAI_API_BASE ?? 'https://api.openai.com/v1';
    this.defaultModel = process.env.OPENAI_DEFAULT_MODEL ?? 'gpt-3.5-turbo';
  }

  /* eslint-disable camelcase */
  async generate(
    prompt: string,
    options: AiGenerateOptions = {}
  ): Promise<AiGenerateResult> {
    const model = options.model ?? this.defaultModel;
    const url = `${this.baseUrl}/chat/completions`;
    const body = {
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 256,
      n: 1,
      stop: options.stop ?? undefined,
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) headers.Authorization = `Bearer ${this.apiKey}`;

    try {
      const resp$ = this.httpService.post(url, body, {
        headers,
        timeout: 120000,
      });
      const resp = await lastValueFrom(resp$);
      const data = resp.data;

      const text =
        data.choices?.[0]?.message?.content ??
        data.choices?.[0]?.text ??
        JSON.stringify(data);
      const usage = data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined;

      return { text, raw: data, usage };
    } catch (err: any) {
      this.logger.error('OpenAiProvider error: ' + (err?.message ?? err));
      throw err;
    }
  }
}
