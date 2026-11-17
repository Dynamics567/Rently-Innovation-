import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

/** Shared by every reason-required admin action here (suspend/disqualify/reject) — same ≥5-char convention as AdminProvidersController's RejectVerificationDto. */
export class ReasonDto {
  @ApiProperty({ minLength: 5 })
  @IsString()
  @MinLength(5)
  reason: string;
}
