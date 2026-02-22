import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { AuditLog, AuditLogSchema } from './audits.schema';
import { AuditsService } from './audits.service';
import { AuditsController } from './audits.controller';
import { AuditsProcessor } from './audits.processor';
import { User, UserSchema } from '../users/users.schema';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AuditLog.name, schema: AuditLogSchema },
      { name: User.name, schema: UserSchema },
    ]),
    BullModule.registerQueue({
      name: 'audits',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      },
    }),
  ],
  controllers: [AuditsController],
  providers: [AuditsService, AuditsProcessor],
  exports: [AuditsService],
})
export class AuditsModule {}
