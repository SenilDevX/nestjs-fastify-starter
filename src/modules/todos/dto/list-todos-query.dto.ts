import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class ListTodosQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: ['pending', 'completed'],
  })
  @IsOptional()
  @IsIn(['pending', 'completed'])
  status?: 'pending' | 'completed';
}
