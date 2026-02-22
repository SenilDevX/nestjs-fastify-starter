import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateRoleDto {
  @ApiPropertyOptional({ example: 'admin' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Full system access' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: ['users.create', 'users.read'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissions?: string[];

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  requiresTwoFactor?: boolean;
}
