import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Module, PermissionAction } from '../../common/enums';

export type PermissionDocument = HydratedDocument<Permission>;

@Schema({
  timestamps: true,
  versionKey: false,
})
export class Permission {
  @Prop({ required: true, unique: true, trim: true })
  name!: string;

  @Prop({ required: true, enum: Module })
  module!: Module;

  @Prop({ required: true, enum: PermissionAction })
  action!: PermissionAction;

  @Prop({ type: String, default: null })
  description!: string | null;
}

export const PermissionSchema = SchemaFactory.createForClass(Permission);
