import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Admin } from 'src/entities/user/authentication/admin.entity';
import { IAdminRepository } from 'src/common/contracts/policy.contract';

@Injectable()
export class GuardAdminRepository implements IAdminRepository {
  constructor(
    @InjectRepository(Admin)
    private readonly adminRepo: Repository<Admin>
  ) {}

  async findOne(userId: string): Promise<Admin | null> {
    return this.adminRepo.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });
  }
}
