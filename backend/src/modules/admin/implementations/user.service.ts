import {
  IUserRepository,
  IUserService,
} from 'src/common/contracts/admin.contract';
import { User } from 'src/entities/user/user.entity';
import { Inject } from '@nestjs/common';

export class AdminUserService implements IUserService {
  constructor(
    @Inject(IUserRepository) private userRepository: IUserRepository
  ) {}
  getEntityById(id: string): Promise<User | null> {
    return this.userRepository.findById(id);
  }

  async count(searchParams: any) {
    return this.userRepository.count(searchParams);
  }
}
