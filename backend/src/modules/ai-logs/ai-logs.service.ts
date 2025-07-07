import { Injectable } from '@nestjs/common';
import { CreateAiLogDto } from './dto/create-ai-log.dto';
import { UpdateAiLogDto } from './dto/update-ai-log.dto';

@Injectable()
export class AiLogsService {
  create(createAiLogDto: CreateAiLogDto) {
    return 'This action adds a new aiLog';
  }

  findAll() {
    return `This action returns all aiLogs`;
  }

  findOne(id: number) {
    return `This action returns a #${id} aiLog`;
  }

  update(id: number, updateAiLogDto: UpdateAiLogDto) {
    return `This action updates a #${id} aiLog`;
  }

  remove(id: number) {
    return `This action removes a #${id} aiLog`;
  }
}
