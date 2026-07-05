import { ApiProperty } from '@nestjs/swagger';
import { IsPhoneNumber, IsString, Length } from 'class-validator';

export class RequestOtpDto {
  @ApiProperty()
  @IsPhoneNumber()
  phone: string;
}

export class VerifyOtpDto {
  @ApiProperty()
  @IsPhoneNumber()
  phone: string;

  @ApiProperty({ description: '6-digit code sent via SMS' })
  @IsString()
  @Length(6, 6)
  code: string;
}
