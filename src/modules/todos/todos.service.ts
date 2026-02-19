import { InjectModel } from '@nestjs/mongoose';
import { Todo, TodoDocument, TodoStatus } from './todos.schema';
import { Model } from 'mongoose';
import { CreateTodoDto } from './dto/create-todo.dto';
import { Inject, Injectable } from '@nestjs/common';
import { UpdateTodoDto } from './dto/update-todo.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  TodoCompletedEvent,
  TodoCreatedEvent,
  TodoEvent,
} from './todos.events.js';
import { BaseService } from '../../common/base.service.js';

@Injectable()
export class TodosService extends BaseService<TodoDocument> {
  constructor(
    @InjectModel(Todo.name) todoModel: Model<TodoDocument>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private eventEmitter: EventEmitter2,
  ) {
    super(todoModel, { cache: cacheManager, prefix: 'todos' });
  }

  async create(dto: CreateTodoDto): Promise<TodoDocument> {
    const todo = await super.create(dto);

    this.eventEmitter.emit(
      TodoEvent.CREATED,
      new TodoCreatedEvent(todo._id.toString(), todo.title),
    );

    return todo;
  }

  async update(id: string, dto: UpdateTodoDto): Promise<TodoDocument> {
    const todo = await super.update(id, dto);

    if (dto.status === TodoStatus.COMPLETED) {
      this.eventEmitter.emit(
        TodoEvent.COMPLETED,
        new TodoCompletedEvent(todo._id.toString(), todo.title),
      );
    }

    return todo;
  }
}
