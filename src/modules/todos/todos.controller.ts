import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { Types } from 'mongoose';
import { TodosService } from './todos.service';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';
import { ListTodosQueryDto } from './dto/list-todos-query.dto';
import { ParseObjectIdPipe } from 'src/common/pipes/parse-object-id.pipe';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import { AuditAction, Module, PermissionAction } from 'src/common/enums';
import { AuditsService } from '../audits/audits.service';

@ApiCookieAuth()
@ApiTags('Todos')
@Controller('todos')
export class TodosController {
  constructor(
    private readonly todosService: TodosService,
    private readonly auditsService: AuditsService,
  ) {}

  @RequirePermission(Module.Todos, PermissionAction.Create)
  @Post()
  async create(
    @Req() req: FastifyRequest,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateTodoDto,
  ) {
    const todo = await this.todosService.create({
      ...dto,
      userId: new Types.ObjectId(userId),
    });
    void this.auditsService.log({
      module: Module.Todos,
      recordId: todo._id.toString(),
      action: AuditAction.Created,
      userId,
      ipAddress: req.ip,
      newValues: { ...dto },
    });
    return todo;
  }

  @RequirePermission(Module.Todos, PermissionAction.Read)
  @Get()
  findAll(
    @CurrentUser('sub') userId: string,
    @Query() query: ListTodosQueryDto,
  ) {
    return this.todosService.findAllForUser(userId, query);
  }

  @RequirePermission(Module.Todos, PermissionAction.Read)
  @Get(':id')
  findOne(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    return this.todosService.findOneForUser(id, userId);
  }

  @RequirePermission(Module.Todos, PermissionAction.Update)
  @Patch(':id')
  async update(
    @Req() req: FastifyRequest,
    @CurrentUser('sub') userId: string,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateTodoDto,
  ) {
    const before = await this.todosService.findOneForUser(id, userId);
    const todo = await this.todosService.updateForUser(id, dto, userId);
    void this.auditsService.log({
      module: Module.Todos,
      recordId: id,
      action: AuditAction.Updated,
      userId,
      ipAddress: req.ip,
      previousValues: {
        title: before.title,
        description: before.description,
        status: before.status,
      },
      newValues: { ...dto },
    });
    return todo;
  }

  @RequirePermission(Module.Todos, PermissionAction.Delete)
  @Delete(':id')
  async remove(
    @Req() req: FastifyRequest,
    @CurrentUser('sub') userId: string,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    const todo = await this.todosService.findOneForUser(id, userId);
    await this.todosService.removeForUser(id, userId);
    void this.auditsService.log({
      module: Module.Todos,
      recordId: id,
      action: AuditAction.Deleted,
      userId,
      ipAddress: req.ip,
      previousValues: { title: todo.title },
    });
  }
}
