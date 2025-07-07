import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { AiLogsService } from './ai-logs.service';
import { CreateAiLogDto } from './dto/create-ai-log.dto';
import { UpdateAiLogDto } from './dto/update-ai-log.dto';

@Controller('ai-logs')
export class AiLogsController {
  constructor(private readonly aiLogsService: AiLogsService) {}

  @Post()
  create(@Body() createAiLogDto: CreateAiLogDto) {
    return this.aiLogsService.create(createAiLogDto);
  }

  @Get()
  findAll() {
    return this.aiLogsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.aiLogsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAiLogDto: UpdateAiLogDto) {
    return this.aiLogsService.update(+id, updateAiLogDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.aiLogsService.remove(+id);
  }
}
