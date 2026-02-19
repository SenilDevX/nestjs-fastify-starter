import { Module } from '@nestjs/common';
import { TodosController } from './todos.controller';
import { TodosService } from './todos.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Todo, TodoSchema } from './todos.schema';
import { TodosListener } from './todos.listener';
import { TodosJob } from 'src/modules/todos/todos.job';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Todo.name, schema: TodoSchema }]),
  ],
  controllers: [TodosController],
  providers: [TodosService, TodosListener, TodosJob],
})
export class TodosModule {}
