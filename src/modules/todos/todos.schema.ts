import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

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
  @Prop({ required: true })
  title: string;

  @Prop()
  description: string;

  @Prop({ enum: TodoStatus, default: TodoStatus.PENDING })
  status: TodoStatus;

  @Prop({ default: false })
  isDeleted: boolean;
}

export const TodoSchema = SchemaFactory.createForClass(Todo);
