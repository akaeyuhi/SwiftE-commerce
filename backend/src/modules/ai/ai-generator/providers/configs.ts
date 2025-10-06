export const huggingFaceModelConfigs = new Map([
  ['gpt2', { type: 'text-generation', maxTokens: 1024 }],
  ['microsoft/DialoGPT-medium', { type: 'text-generation', maxTokens: 512 }],
  [
    'facebook/blenderbot-400M-distill',
    { type: 'text2text-generation', maxTokens: 256 },
  ],
  ['google/flan-t5-small', { type: 'text2text-generation', maxTokens: 512 }],
]);

// Pricing per 1K tokens (update as needed)
export const openAiModelPricing = new Map([
  ['gpt-3.5-turbo', { input: 0.0015, output: 0.002 }],
  ['gpt-3.5-turbo-16k', { input: 0.003, output: 0.004 }],
  ['gpt-4', { input: 0.03, output: 0.06 }],
  ['gpt-4-32k', { input: 0.06, output: 0.12 }],
  ['text-davinci-003', { input: 0.02, output: 0.02 }],
  ['text-curie-001', { input: 0.002, output: 0.002 }],
]);

export const openAiModelConfigs = new Map([
  ['gpt-3.5-turbo', { maxTokens: 4096, type: 'chat' }],
  ['gpt-3.5-turbo-16k', { maxTokens: 16384, type: 'chat' }],
  ['gpt-4', { maxTokens: 8192, type: 'chat' }],
  ['gpt-4-32k', { maxTokens: 32768, type: 'chat' }],
  ['text-davinci-003', { maxTokens: 4000, type: 'completion' }],
  ['text-curie-001', { maxTokens: 2048, type: 'completion' }],
]);
