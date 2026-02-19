import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { TodoCompletedEvent, TodoCreatedEvent } from '../../events/todo.events';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TodosListener {
  constructor(private notificationsService: NotificationsService) {}

  @OnEvent('todo.created')
  async handleTodoCreated(event: TodoCreatedEvent) {
    await this.notificationsService.sendTodoCreated(event.todoId, event.title);
  }

  @OnEvent('todo.completed')
  async handleTodoCompleted(event: TodoCompletedEvent) {
    await this.notificationsService.sendTodoCompleted(
      event.todoId,
      event.title,
    );
  }
}
