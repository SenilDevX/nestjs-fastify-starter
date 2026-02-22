import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'admin' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 'Full system access' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: ['users.create', 'users.read'], type: [String] })
  @IsArray()
  @IsString({ each: true })
  permissions!: string[];

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  requiresTwoFactor?: boolean;
}
