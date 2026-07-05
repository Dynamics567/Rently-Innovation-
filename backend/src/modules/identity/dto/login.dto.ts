import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsPhoneNumber, IsString, ValidateIf } from 'class-validator';

export class LoginDto {
  @ApiPropertyOptional()
  @ValidateIf((o) => !o.phone)
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @ValidateIf((o) => !o.email)
  @IsPhoneNumber()
  phone?: string;

  @ApiProperty()
  @IsString()
  password: string;
}
