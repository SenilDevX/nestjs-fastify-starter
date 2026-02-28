import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import type { RoleDocument } from '../roles/roles.schema';

export type UserDocument = HydratedDocument<User>;
export type UserWithRole = UserDocument & { role?: RoleDocument };

@Schema({
  timestamps: true,
  versionKey: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class User {
  @Prop({ required: true, trim: true })
  firstName!: string;

  @Prop({ required: true, trim: true })
  lastName!: string;

  @Prop({ required: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true })
  password!: string;

  @Prop({ default: false })
  isTwoFactorEnabled!: boolean;

  @Prop({ type: String, default: null })
  twoFactorSecret!: string | null;

  @Prop({ type: String, default: null })
  twoFactorTempSecret!: string | null;

  @Prop({ type: String, default: null })
  passwordResetToken!: string | null;

  @Prop({ type: Date, default: null })
  passwordResetExpires!: Date | null;

  @Prop({ default: false })
  mustChangePassword!: boolean;

  @Prop({ default: false })
  mustSetupTwoFactor!: boolean;

  @Prop({ type: Types.ObjectId, ref: 'Role', default: null })
  roleId!: Types.ObjectId | null;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ type: Date, default: null })
  lastLoginAt!: Date | null;

  @Prop({ type: Date, default: null })
  deletedAt!: Date | null;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ deletedAt: 1 });
UserSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
);
UserSchema.index({ passwordResetToken: 1 });
UserSchema.index({ roleId: 1 });

UserSchema.virtual('role', {
  ref: 'Role',
  localField: 'roleId',
  foreignField: '_id',
  justOne: true,
});
