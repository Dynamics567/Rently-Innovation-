import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, MinLength } from 'class-validator';

/** [Admin] Brief §7's "authorized manual adjustments" — pointsDelta may be negative (a correction). Zero/non-integer values are rejected by PointsLedgerService.manualAdjust() itself. */
export class AdjustPointsDto {
  @ApiProperty()
  @IsInt()
  pointsDelta: number;

  @ApiProperty({ minLength: 5 })
  @IsString()
  @MinLength(5)
  reason: string;
}
