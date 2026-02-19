import { IsString, IsOptional, IsEnum } from 'class-validator';
import { TodoStatus } from '../todos.schema';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTodoDto {
  @ApiProperty({ example: 'Buy groceries', required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ example: 'From the supermarket', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: TodoStatus, required: false })
  @IsEnum(TodoStatus)
  @IsOptional()
  status?: TodoStatus;
}
