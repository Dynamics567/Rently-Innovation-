import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsPhoneNumber, IsString, Length, MinLength } from 'class-validator';

export class RequestPasswordResetDto {
  @ApiProperty()
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  token: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  newPassword: string;
}

/** Phone-based alternative to RequestPasswordResetDto, for accounts without reliable email. */
export class RequestPasswordResetOtpDto {
  @ApiProperty()
  @IsPhoneNumber()
  phone: string;
}

export class ResetPasswordWithOtpDto {
  @ApiProperty()
  @IsPhoneNumber()
  phone: string;

  @ApiProperty({ description: '6-digit code sent via SMS' })
  @IsString()
  @Length(6, 6)
  code: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
