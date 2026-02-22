import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type TodoDocument = HydratedDocument<Todo>;

export enum TodoStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
}

@Schema({
  timestamps: true,
  versionKey: false,
})
export class Todo {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  title!: string;

  @Prop()
  description!: string;

  @Prop({ enum: TodoStatus, default: TodoStatus.PENDING })
  status!: TodoStatus;

  @Prop({ type: Date, default: null })
  deletedAt!: Date | null;
}

export const TodoSchema = SchemaFactory.createForClass(Todo);

TodoSchema.index({ userId: 1, deletedAt: 1 });
