import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Job } from 'bullmq';
import { Logger } from 'nestjs-pino';
import { AuditLog, AuditLogDocument } from './audits.schema';
import { User, UserDocument } from '../users/users.schema';
import type { RoleDocument } from '../roles/roles.schema';
import { AuditAction, Module } from '../../common/enums';
import { AuditEvent } from './audits.events';

export interface AuditJobData {
  module: Module;
  recordId: string;
  action: AuditAction;
  userId: string;
  ipAddress: string;
  previousValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
}

@Processor('audits')
export class AuditsProcessor extends WorkerHost {
  constructor(
    private readonly logger: Logger,
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLogDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {
    super();
  }

  async process(job: Job<AuditJobData, unknown, string>) {
    try {
      switch (job.name as AuditEvent) {
        case AuditEvent.LOG:
          await this.writeAuditLog(job.data);
          break;
        default:
          this.logger.warn(
            { jobName: job.name },
            'Unknown audit job',
            AuditsProcessor.name,
          );
      }
    } catch (error: unknown) {
      this.logger.error(
        { jobId: job.id, jobName: job.name, error: String(error) },
        'Audit job failed',
        AuditsProcessor.name,
      );
      throw error;
    }
  }

  private async writeAuditLog(data: AuditJobData) {
    const user = await this.userModel.findById(data.userId).populate('roleId');
    const role = user?.roleId as unknown as RoleDocument | null;
    const name =
      [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'N/A';

    await this.auditLogModel.create({
      module: data.module,
      recordId: new Types.ObjectId(data.recordId),
      action: data.action,
      userId: new Types.ObjectId(data.userId),
      userName: name,
      userEmail: user?.email ?? 'N/A',
      userRole: role?.name ?? 'N/A',
      previousValues: data.previousValues ?? null,
      newValues: data.newValues ?? null,
      ipAddress: data.ipAddress,
    });
  }
}
