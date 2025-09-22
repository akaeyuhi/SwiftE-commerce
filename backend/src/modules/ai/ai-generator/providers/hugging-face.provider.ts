import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import {
  AiProvider,
  AiGenerateOptions,
  AiGenerateResult,
} from 'src/common/interfaces/ai.interface';

/**
 * HuggingFaceProvider
 *
 * Uses the Hugging Face Inference API (text generation). Set HF_API_KEY env var.
 * Example endpoint: POST https://api-inference.huggingface.co/models/<model>
 *
 * The provider tries to be generic: you pass model in options or default MODEL env var.
 */
@Injectable()
export class HuggingFaceProvider implements AiProvider {
  private readonly logger = new Logger(HuggingFaceProvider.name);
  private readonly hfKey?: string;
  private readonly defaultModel: string;

  constructor(private readonly httpService: HttpService) {
    this.hfKey = process.env.HF_API_KEY;
    this.defaultModel = process.env.HF_DEFAULT_MODEL ?? 'gpt2'; // replace with a small generation model you prefer
  }

  /* eslint-disable camelcase */
  async generate(
    prompt: string,
    options: AiGenerateOptions = {}
  ): Promise<AiGenerateResult> {
    const model = options.model ?? this.defaultModel;
    const url = `https://api-inference.huggingface.co/models/${model}`;
    const payload: any = {
      inputs: prompt,
      parameters: {
        max_new_tokens: options.maxTokens ?? 128,
        temperature: options.temperature ?? 0.7,
        // top_k/top_p etc. may live in options
        ...(options.stop ? { stop: options.stop } : {}),
      },
      options: { wait_for_model: true },
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.hfKey) headers.Authorization = `Bearer ${this.hfKey}`;

    try {
      const resp$ = this.httpService.post(url, payload, {
        headers,
        timeout: 120000,
      });
      const resp = await lastValueFrom(resp$);
      const data = resp.data;

      // Hugging Face may return an array or object depending on model
      let text: string;
      if (
        Array.isArray(data) &&
        data.length > 0 &&
        typeof data[0].generated_text === 'string'
      ) {
        text = data[0].generated_text;
      } else if (data.generated_text) {
        text = data.generated_text;
      } else if (typeof data === 'string') {
        text = data;
      } else if (
        Array.isArray(data) &&
        data.length > 0 &&
        typeof data[0] === 'string'
      ) {
        text = data[0];
      } else {
        text = JSON.stringify(data).slice(0, 2048);
      }

      return { text, raw: data };
    } catch (err: any) {
      this.logger.error(`HuggingFaceProvider error: ${err?.message ?? err}`);
      throw err;
    }
  }
}
