import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { UserRole } from '../enums/user-role.enum';

/**
 * Either email or phone is required (FR1.1) — enforced with @ValidateIf
 * rather than making both optional at the type level and hoping the service
 * remembers to check. Validation that can live in the DTO belongs in the
 * DTO; it runs before the request ever reaches a Service.
 */
export class SignupDto {
  @ApiPropertyOptional()
  @ValidateIf((o) => !o.phone)
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @ValidateIf((o) => !o.email)
  @IsPhoneNumber()
  phone?: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  fullName: string;

  @ApiProperty({ enum: UserRole, isArray: true, default: [UserRole.RENTER] })
  @IsOptional()
  @IsEnum(UserRole, { each: true })
  roles?: UserRole[];
}
