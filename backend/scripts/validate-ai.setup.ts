import { HuggingFaceProvider } from 'src/modules/ai/ai-generator/providers/hugging-face.provider';
import { HttpService } from '@nestjs/axios';
import { OpenAiProvider } from 'src/modules/ai/ai-generator/providers/open-ai.provider';

async function validateSetup() {
  console.log('🔍 Validating AI Generator Setup...\n');

  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log(`AI_PROVIDER: ${process.env.AI_PROVIDER || 'NOT SET'}`);
  console.log(
    `HF_API_KEY: ${process.env.HF_API_KEY ? '✅ SET' : '❌ NOT SET'}`
  );
  console.log(
    `OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✅ SET' : '❌ NOT SET'}`
  );
  console.log(
    `AI_AUDIT_ENC_KEY: ${process.env.AI_AUDIT_ENC_KEY ? '✅ SET' : '❌ NOT SET'}`
  );

  // Test providers
  const httpService = new HttpService();

  if (process.env.HF_API_KEY) {
    console.log('\n🤗 Testing HuggingFace Provider...');
    try {
      const hfProvider = new HuggingFaceProvider(
        httpService,
        null as any,
        null as any
      );
      const health = await hfProvider.healthCheck();
      console.log(
        `HuggingFace: ${health.healthy ? '✅ HEALTHY' : '❌ UNHEALTHY'}`
      );
      if (!health.healthy) console.log(`Error: ${health.error}`);
    } catch (error) {
      console.log(`HuggingFace: ❌ ERROR - ${error.message}`);
    }
  }

  if (process.env.OPENAI_API_KEY) {
    console.log('\n🤖 Testing OpenAI Provider...');
    try {
      const openaiProvider = new OpenAiProvider(
        httpService,
        null as any,
        null as any
      );
      const health = await openaiProvider.healthCheck();
      console.log(`OpenAI: ${health.healthy ? '✅ HEALTHY' : '❌ UNHEALTHY'}`);
      if (!health.healthy) console.log(`Error: ${health.error}`);
    } catch (error) {
      console.log(`OpenAI: ❌ ERROR - ${error.message}`);
    }
  }

  console.log('\n✨ Validation complete!');
}

validateSetup().catch(console.error);
