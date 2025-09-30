import { Module } from '@nestjs/common';
import { ConfirmationService } from './confirmation.service';
import { ConfirmationCleanupService } from 'src/modules/auth/confirmation/confirmation-cleanup.service';
import { ConfirmationRepository } from 'src/modules/auth/confirmation/confirmation.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Confirmation } from 'src/modules/auth/confirmation/entities/confirmation.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Confirmation])],
  providers: [
    ConfirmationService,
    ConfirmationCleanupService,
    ConfirmationRepository,
  ],
})
export class ConfirmationModule {}
