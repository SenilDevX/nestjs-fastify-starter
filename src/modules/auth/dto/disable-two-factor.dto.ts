import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class DisableTwoFactorDto {
  @ApiProperty({ example: 'P@ssw0rd' })
  @IsString()
  password!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6, { message: 'token must be exactly 6 digits' })
  token!: string;
}
