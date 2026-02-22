import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import {
  PermissionAction,
  PermissionModule,
} from '../../common/enums/permission.enum';

export type PermissionDocument = HydratedDocument<Permission>;

@Schema({
  timestamps: true,
  versionKey: false,
})
export class Permission {
  @Prop({ required: true, unique: true, trim: true })
  name!: string;

  @Prop({ required: true, enum: PermissionModule })
  module!: PermissionModule;

  @Prop({ required: true, enum: PermissionAction })
  action!: PermissionAction;

  @Prop({ type: String, default: null })
  description!: string | null;
}

export const PermissionSchema = SchemaFactory.createForClass(Permission);
