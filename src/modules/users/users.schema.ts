import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({
  timestamps: true,
  versionKey: false,
})
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
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
  isDeleted!: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
