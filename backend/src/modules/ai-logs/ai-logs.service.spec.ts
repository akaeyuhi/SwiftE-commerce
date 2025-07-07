import { Test, TestingModule } from '@nestjs/testing';
import { AiLogsService } from './ai-logs.service';

describe('AiLogsService', () => {
  let service: AiLogsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AiLogsService],
    }).compile();

    service = module.get<AiLogsService>(AiLogsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
