import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RoleDocument = HydratedDocument<Role>;

@Schema({
  timestamps: true,
  versionKey: false,
})
export class Role {
  @Prop({ required: true, unique: true, trim: true })
  name!: string;

  @Prop({ type: String, default: null })
  description!: string | null;

  @Prop({ type: [String], default: [] })
  permissions!: string[];

  @Prop({ default: false })
  requiresTwoFactor!: boolean;

  @Prop({ default: false })
  isSystem!: boolean;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ type: Date, default: null })
  deletedAt!: Date | null;
}

export const RoleSchema = SchemaFactory.createForClass(Role);
