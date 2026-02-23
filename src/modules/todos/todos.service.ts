import { InjectModel } from '@nestjs/mongoose';
import { Todo, TodoDocument, TodoStatus } from './todos.schema';
import { Model, Types, UpdateQuery, QueryFilter } from 'mongoose';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UpdateTodoDto } from './dto/update-todo.dto';
import { ListTodosQueryDto } from './dto/list-todos-query.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  TodoCompletedEvent,
  TodoCreatedEvent,
  TodoEvent,
} from './todos.events.js';
import { BaseService } from '../../common/base.service.js';
import { buildSort } from '../../common/utils/build-sort';
import { PaginatedResult } from '../../common/types';

@Injectable()
export class TodosService extends BaseService<TodoDocument> {
  constructor(
    @InjectModel(Todo.name) private todoModel: Model<TodoDocument>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private eventEmitter: EventEmitter2,
  ) {
    super(todoModel, { cache: cacheManager, prefix: 'todos' });
  }

  protected afterCreate(todo: TodoDocument): void {
    this.eventEmitter.emit(
      TodoEvent.CREATED,
      new TodoCreatedEvent(todo._id.toString(), todo.title),
    );
  }

  protected afterUpdate(
    _id: string,
    dto: UpdateQuery<TodoDocument>,
    todo: TodoDocument,
  ): void {
    if ((dto as UpdateTodoDto).status === TodoStatus.COMPLETED) {
      this.eventEmitter.emit(
        TodoEvent.COMPLETED,
        new TodoCompletedEvent(todo._id.toString(), todo.title),
      );
    }
  }

  async findAllForUser(
    userId: string,
    dto: ListTodosQueryDto,
  ): Promise<PaginatedResult<TodoDocument>> {
    const filter: QueryFilter<TodoDocument> = {
      userId: new Types.ObjectId(userId),
    };

    if (dto.s) {
      const regex = { $regex: dto.s, $options: 'i' };
      filter.$or = [{ title: regex }, { description: regex }];
    }

    if (dto.status) {
      filter.status = dto.status;
    }

    const sort = buildSort(dto.sortBy, dto.sortOrder, [
      'title',
      'status',
      'createdAt',
    ]);

    return this.findAll(filter, dto.page, dto.limit, sort);
  }

  async findOneForUser(id: string, userId: string): Promise<TodoDocument> {
    const doc = await this.todoModel.findOne({
      _id: id,
      userId: new Types.ObjectId(userId),
      deletedAt: null,
    } as QueryFilter<TodoDocument>);
    if (!doc) throw new NotFoundException('Record not found');
    return doc;
  }

  async updateForUser(
    id: string,
    dto: UpdateTodoDto,
    userId: string,
  ): Promise<TodoDocument> {
    const doc = await this.todoModel.findOneAndUpdate(
      {
        _id: id,
        userId: new Types.ObjectId(userId),
        deletedAt: null,
      } as QueryFilter<TodoDocument>,
      dto as UpdateQuery<TodoDocument>,
      { new: true },
    );
    if (!doc) throw new NotFoundException('Record not found');
    this.afterUpdate(id, dto as UpdateQuery<TodoDocument>, doc);
    return doc;
  }

  async removeForUser(id: string, userId: string): Promise<void> {
    const doc = await this.todoModel.findOneAndUpdate(
      {
        _id: id,
        userId: new Types.ObjectId(userId),
        deletedAt: null,
      } as QueryFilter<TodoDocument>,
      { deletedAt: new Date() } as UpdateQuery<TodoDocument>,
    );
    if (!doc) throw new NotFoundException('Record not found');
    await this.afterRemove(id);
  }
}
