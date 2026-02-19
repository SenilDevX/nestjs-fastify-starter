import { InjectModel } from '@nestjs/mongoose';
import { Todo, TodoDocument, TodoStatus } from './todos.schema';
import { Model, QueryFilter } from 'mongoose';
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
import { PaginatedResult } from '../../common/types/index.js';

@Injectable()
export class TodosService extends BaseService<TodoDocument> {
  constructor(
    @InjectModel(Todo.name) todoModel: Model<TodoDocument>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private eventEmitter: EventEmitter2,
  ) {
    super(todoModel);
  }

  async create(dto: CreateTodoDto): Promise<TodoDocument> {
    const todo = await super.create(dto);
    await this.invalidateListCache();

    // Create event
    this.eventEmitter.emit(
      TodoEvent.CREATED,
      new TodoCreatedEvent(todo._id.toString(), todo.title),
    );

    return todo;
  }

  async findAll(
    filter: QueryFilter<TodoDocument> = {},
    page = 1,
    limit = 10,
  ): Promise<PaginatedResult<TodoDocument>> {
    const cacheKey = `todos_list:p${page}:l${limit}`;

    const cached =
      await this.cacheManager.get<PaginatedResult<TodoDocument>>(cacheKey);
    if (cached) return cached;

    const result = await super.findAll(filter, page, limit);
    await this.cacheManager.set(cacheKey, result);
    return result;
  }

  private async invalidateListCache(): Promise<void> {
    const store = this.cacheManager.stores[0];
    if (!store.iterator) return;

    const keysToDelete: string[] = [];

    for await (const [key] of store.iterator(undefined)) {
      if (typeof key === 'string' && key.startsWith('todos_list:')) {
        keysToDelete.push(key);
      }
    }

    if (keysToDelete.length > 0) {
      await this.cacheManager.mdel(keysToDelete);
    }
  }

  async findOne(id: string): Promise<TodoDocument> {
    const cached = await this.cacheManager.get<TodoDocument>(`todo_${id}`);
    if (cached) return cached;

    const todo = await super.findOne(id);

    await this.cacheManager.set(`todo_${id}`, todo);
    return todo;
  }

  async update(id: string, dto: UpdateTodoDto): Promise<TodoDocument> {
    const todo = await super.update(id, dto);

    // Invalidate caches
    await this.cacheManager.del(`todo_${id}`);
    await this.invalidateListCache();

    // Complete event
    if (dto.status === TodoStatus.COMPLETED) {
      this.eventEmitter.emit(
        TodoEvent.COMPLETED,
        new TodoCompletedEvent(todo._id.toString(), todo.title),
      );
    }

    return todo;
  }

  async remove(id: string): Promise<void> {
    await super.remove(id);
    await this.cacheManager.del(`todo_${id}`);
    await this.invalidateListCache();
  }
}
