import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MinLength } from 'class-validator';

/** [Admin] Brief §6 rule 6 — a manual attribution override always needs a referred user id and an audited reason. */
export class ManualAttributeReferralDto {
  @ApiProperty()
  @IsUUID()
  referredUserId: string;

  @ApiProperty({ minLength: 5 })
  @IsString()
  @MinLength(5)
  reason: string;
}
