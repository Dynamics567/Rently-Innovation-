import { ApiProperty } from '@nestjs/swagger';
import { Equals } from 'class-validator';

/** Brief §4 — "agreement to campaign rules" is a required, explicit checkbox, not implied by hitting the endpoint. */
export class RegisterAmbassadorDto {
  @ApiProperty({ default: true })
  @Equals(true, { message: 'You must agree to the campaign rules to register as an ambassador.' })
  agreeToRules: boolean;
}
