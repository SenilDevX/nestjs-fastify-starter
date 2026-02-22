import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { QueryFilter, Model, Types } from 'mongoose';
import { AuditLog, AuditLogDocument } from './audits.schema';
import { AuditAction, Module } from '../../common/enums';
import { PaginatedResult } from '../../common/types';
import { User, UserDocument } from '../users/users.schema';
import type { RoleDocument } from '../roles/roles.schema';

@Injectable()
export class AuditsService {
  constructor(
    @InjectModel(AuditLog.name)
    private auditLogModel: Model<AuditLogDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}

  async log(params: {
    module: Module;
    recordId: string;
    action: AuditAction;
    userId: string;
    ipAddress: string;
    previousValues?: Record<string, unknown> | null;
    newValues?: Record<string, unknown> | null;
  }): Promise<void> {
    const user = await this.userModel
      .findById(params.userId)
      .populate('roleId');
    const role = user?.roleId as unknown as RoleDocument | null;
    const name =
      [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'N/A';

    await this.auditLogModel.create({
      module: params.module,
      recordId: new Types.ObjectId(params.recordId),
      action: params.action,
      userId: new Types.ObjectId(params.userId),
      userName: name,
      userEmail: user?.email ?? 'N/A',
      userRole: role?.name ?? 'N/A',
      previousValues: params.previousValues ?? null,
      newValues: params.newValues ?? null,
      ipAddress: params.ipAddress,
    });
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
