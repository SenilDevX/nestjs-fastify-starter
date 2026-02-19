import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { TodoEvent } from '../todos/todos.events.js';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectQueue('notifications') private notificationsQueue: Queue,
  ) {}

  async sendTodoCreated(todoId: string, title: string) {
    await this.notificationsQueue.add(TodoEvent.CREATED, { todoId, title });
  }

  async sendTodoCompleted(todoId: string, title: string) {
    await this.notificationsQueue.add(TodoEvent.COMPLETED, { todoId, title });
  }
}
