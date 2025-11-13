import { IUserRepository } from 'src/common/contracts/admin.contract';
import { User } from 'src/entities/user/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

export class AdminUserRepository implements IUserRepository {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOneBy({ id } as any);
  }

  async count(searchParams: any) {
    return this.userRepository.count(searchParams);
  }
}
