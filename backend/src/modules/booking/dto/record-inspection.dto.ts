import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';

export class RecordInspectionDto {
  @ApiProperty()
  @IsBoolean()
  damageFound: boolean;

  @ApiPropertyOptional({ description: 'Required when damageFound is true' })
  @ValidateIf((o: RecordInspectionDto) => o.damageFound)
  @IsString()
  @MinLength(5)
  description?: string;

  @ApiPropertyOptional({ type: [String], description: 'Storage keys for uploaded evidence photos' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidenceKeys?: string[];
}
