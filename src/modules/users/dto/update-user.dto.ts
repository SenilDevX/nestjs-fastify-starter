import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'Role ID to assign' })
  @IsOptional()
  @IsString()
  roleId?: string;

  @ApiPropertyOptional({
    description:
      'Enable: sets mustSetupTwoFactor (user configures on next login). Disable: clears all 2FA fields.',
  })
  @IsOptional()
  @IsBoolean()
  twoFactorEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Activate or deactivate user account' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
