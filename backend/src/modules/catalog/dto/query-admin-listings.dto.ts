import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { QueryListingsDto } from './query-listings.dto';
import { ListingStatus } from '../enums/listing.enums';

export class QueryAdminListingsDto extends QueryListingsDto {
  @ApiPropertyOptional({
    enum: ListingStatus,
    description:
      'Narrows to one status — e.g. PENDING_REVIEW is what backs the moderation-queue-style filtered view. Omitted: every status.',
  })
  @IsOptional()
  @IsEnum(ListingStatus)
  status?: ListingStatus;
}
