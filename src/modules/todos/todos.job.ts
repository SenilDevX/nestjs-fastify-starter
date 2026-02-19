import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Model } from 'mongoose';
import { Todo, TodoDocument } from 'src/modules/todos/todos.schema';

@Injectable()
export class TodosJob {
  constructor(@InjectModel(Todo.name) private todoModel: Model<TodoDocument>) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async logTodos() {
    console.log('[Cron] Logging todos...');

    const todos = await this.todoModel.find({ isDeleted: false });

    if (todos.length === 0) {
      console.log('[Cron] No todos found');
      return;
    }

    console.log(`[Cron] Found ${todos.length} todos:`);
  }
}
