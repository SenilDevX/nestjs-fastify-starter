import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { TodosService } from './todos.service';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { ParseObjectIdPipe } from 'src/common/pipes/parse-object-id.pipe';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@ApiBearerAuth()
@ApiTags('Todos')
@Controller('todos')
export class TodosController {
  constructor(private readonly todosService: TodosService) {}

  @Post()
  create(@CurrentUser('sub') userId: string, @Body() dto: CreateTodoDto) {
    return this.todosService.create({
      ...dto,
      userId: new Types.ObjectId(userId),
    });
  }

  @Get()
  findAll(
    @CurrentUser('sub') userId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.todosService.findAll(
      { userId: new Types.ObjectId(userId) },
      query.page,
      query.limit,
    );
  }

  @Get(':id')
  findOne(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    return this.todosService.findOneForUser(id, userId);
  }

  @Patch(':id')
  update(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateTodoDto,
  ) {
    return this.todosService.updateForUser(id, dto, userId);
  }

  @Delete(':id')
  remove(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    return this.todosService.removeForUser(id, userId);
  }
}
