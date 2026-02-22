import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QueryFilter, Model, Types } from 'mongoose';
import { AuditLog, AuditLogDocument } from './audits.schema';
import { AuditAction, Module } from '../../common/enums';
import { PaginatedResult } from '../../common/types';
import { AuditEvent } from './audits.events';
import type { AuditJobData } from './audits.processor';

@Injectable()
export class AuditsService {
  constructor(
    @InjectModel(AuditLog.name)
    private auditLogModel: Model<AuditLogDocument>,
    @InjectQueue('audits') private readonly auditsQueue: Queue,
  ) {}

  async log(params: AuditJobData): Promise<void> {
    await this.auditsQueue.add(AuditEvent.LOG, params);
  }

  async findAll(
    options: {
      module?: Module;
      recordId?: string;
      userId?: string;
      action?: AuditAction;
      fromDate?: string;
      toDate?: string;
    },
    page = 1,
    limit = 10,
  ): Promise<PaginatedResult<AuditLogDocument>> {
    const filter: QueryFilter<AuditLogDocument> = {};

    if (options.module) {
      filter.module = options.module;
    }
    if (options.recordId) {
      filter.recordId = new Types.ObjectId(options.recordId);
    }
    if (options.userId) {
      filter.userId = new Types.ObjectId(options.userId);
    }
    if (options.action) {
      filter.action = options.action;
    }
    if (options.fromDate || options.toDate) {
      const dateFilter: { $gte?: Date; $lte?: Date } = {};
      if (options.fromDate) {
        dateFilter.$gte = new Date(options.fromDate);
      }
      if (options.toDate) {
        dateFilter.$lte = new Date(options.toDate);
      }
      filter.createdAt = dateFilter;
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.auditLogModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.auditLogModel.countDocuments(filter),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
