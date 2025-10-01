import { Module } from '@nestjs/common';
import { ConfirmationService } from './confirmation.service';
import { ConfirmationCleanupService } from 'src/modules/auth/confirmation/confirmation-cleanup.service';
import { ConfirmationRepository } from 'src/modules/auth/confirmation/confirmation.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Confirmation } from 'src/modules/auth/confirmation/entities/confirmation.entity';
import { EmailModule } from 'src/modules/email/email.module';
import { UserModule } from 'src/modules/user/user.module';
import { AdminModule } from 'src/modules/admin/admin.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Confirmation]),
    EmailModule,
    UserModule,
    AdminModule,
  ],
  providers: [
    ConfirmationService,
    ConfirmationCleanupService,
    ConfirmationRepository,
  ],
  exports: [ConfirmationService, ConfirmationRepository],
})
export class ConfirmationModule {}
