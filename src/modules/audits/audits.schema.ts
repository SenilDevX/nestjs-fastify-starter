import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { AuditAction, Module } from '../../common/enums';

export type AuditLogDocument = HydratedDocument<AuditLog>;

@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  versionKey: false,
  collection: 'audit_logs',
})
export class AuditLog {
  @Prop({ required: true, enum: Module })
  module!: Module;

  @Prop({ type: Types.ObjectId, required: true })
  recordId!: Types.ObjectId;

  @Prop({ required: true, enum: AuditAction })
  action!: AuditAction;

  @Prop({ type: Types.ObjectId, required: true })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  userName!: string;

  @Prop({ required: true })
  userEmail!: string;

  @Prop({ required: true })
  userRole!: string;

  @Prop({ type: Object, default: null })
  previousValues!: Record<string, unknown> | null;

  @Prop({ type: Object, default: null })
  newValues!: Record<string, unknown> | null;

  @Prop({ required: true })
  ipAddress!: string;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

AuditLogSchema.index({ module: 1, recordId: 1 });
AuditLogSchema.index({ createdAt: 1 });
