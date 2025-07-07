import { Test, TestingModule } from '@nestjs/testing';
import { AiLogsController } from './ai-logs.controller';
import { AiLogsService } from './ai-logs.service';

describe('AiLogsController', () => {
  let controller: AiLogsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiLogsController],
      providers: [AiLogsService],
    }).compile();

    controller = module.get<AiLogsController>(AiLogsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
