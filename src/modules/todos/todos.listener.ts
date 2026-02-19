import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import {
  TodoCompletedEvent,
  TodoCreatedEvent,
  TodoEvent,
} from './todos.events.js';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TodosListener {
  constructor(private notificationsService: NotificationsService) {}

  @OnEvent(TodoEvent.CREATED)
  async handleTodoCreated(event: TodoCreatedEvent) {
    await this.notificationsService.sendTodoCreated(event.todoId, event.title);
  }

  @OnEvent(TodoEvent.COMPLETED)
  async handleTodoCompleted(event: TodoCompletedEvent) {
    await this.notificationsService.sendTodoCompleted(
      event.todoId,
      event.title,
    );
  }
}
