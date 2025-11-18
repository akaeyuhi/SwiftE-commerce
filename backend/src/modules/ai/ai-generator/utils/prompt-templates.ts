export const promptTemplates = new Map([
  [
    'productName',
    {
      template: `You are a creative product naming expert.
Context: {{storeStyle}}
Seed words: {{seed}}
Generate {{count}} short, catchy product names (2-4 words each).
Return only a JSON array of strings.`,
      defaultOptions: { maxTokens: 200, temperature: 0.8 },
    },
  ],
  [
    'productDescription',
    {
      template: `Write a compelling product description for "{{productName}}".
{{productSpec}}
Tone: {{tone}}
Length: 40-100 words.
Return JSON: {"title": "<short title>", "description": "<description>"}`,
      defaultOptions: { maxTokens: 300, temperature: 0.7 },
    },
  ],
  [
    'productIdeas',
    {
      template: `You are a product ideation assistant.
Store style: {{storeStyle}}
Seed concepts: {{seed}}
Generate {{count}} innovative product ideas.
For each idea provide: {"name": "...", "concept": "...", "rationale": "..."}
Return as JSON array.`,
      defaultOptions: { maxTokens: 500, temperature: 0.9 },
    },
  ],
  [
    'custom',
    {
      template: '{{prompt}}',
      defaultOptions: { maxTokens: 256, temperature: 0.7 },
    },
  ],
  [
    'image',
    {
      template: '{{prompt}}',
      defaultOptions: { maxTokens: 100, temperature: 0.7 },
    },
  ],
  [
    'newsPost',
    {
      template: `You are a content creator for an e-commerce store.
Topic: {{topic}}
Tone: {{tone}}
Length: {{length}} words.
Generate a news post for the store.
Return JSON: {"title": "<post title>", "content": "<post content>"}.`,
      defaultOptions: { maxTokens: 400, temperature: 0.75 },
    },
  ],
]);
