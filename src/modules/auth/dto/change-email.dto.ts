import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class ChangeEmailDto {
  @ApiProperty({ example: 'new-email@example.com' })
  @IsEmail()
  newEmail!: string;

  @ApiProperty({ example: 'P@ssw0rd' })
  @IsString()
  password!: string;
}
