import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserDto } from './dto/user.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { BaseController } from 'src/common/abstracts/base.controller';
import { User } from 'src/entities/user.entity';
import { RolesGuard } from 'src/common/guards/roles.guard';

@Controller('users')
export class UsersController extends BaseController<
  User,
  UserDto,
  CreateUserDto,
  UpdateUserDto
> {
  constructor(private readonly userService: UsersService) {
    super(userService);
  }

  @Post()
  async register(@Body() dto: CreateUserDto): Promise<UserDto> {
    return this.userService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get()
  @Roles('admin')
  async findAll(): Promise<UserDto[]> {
    return this.userService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<UserDto> {
    return this.userService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto
  ): Promise<UserDto> {
    return this.userService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(':id')
  @Roles('admin')
  async remove(@Param('id') id: string): Promise<void> {
    return this.userService.remove(id);
  }

  // Additional endpoints:
  // POST /users/:id/roles
  // POST /users/:id/stores
  // POST /users/:id/ai-logs
}
