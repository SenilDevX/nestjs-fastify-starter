import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectQueue('notifications') private notificationsQueue: Queue,
  ) {}

  async sendTodoCreated(todoId: string, title: string) {
    await this.notificationsQueue.add('todo.created', { todoId, title });
  }

  async sendTodoCompleted(todoId: string, title: string) {
    await this.notificationsQueue.add('todo.completed', { todoId, title });
  }
}
