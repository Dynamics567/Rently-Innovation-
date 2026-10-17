import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class ReorderPhotosDto {
  @ApiProperty({ type: [String], description: "Every one of this listing's existing photo ids, in the new display order" })
  @IsArray()
  @IsUUID('4', { each: true })
  photoIds: string[];
}
