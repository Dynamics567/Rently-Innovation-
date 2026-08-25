import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { VerificationDocumentType } from '../enums/verification-status.enum';

export class UploadVerificationDocumentDto {
  @ApiProperty({ enum: VerificationDocumentType })
  @IsEnum(VerificationDocumentType)
  docType: VerificationDocumentType;
}
