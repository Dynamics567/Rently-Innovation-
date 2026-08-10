import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageModule } from '@common/storage/storage.module';
import { IdentityModule } from '@modules/identity/identity.module';

import { Category } from './entities/category.entity';
import { Listing } from './entities/listing.entity';
import { ListingPhoto } from './entities/listing-photo.entity';
import { AvailabilityBlock } from './entities/availability-block.entity';

import { CategoryRepository } from './repositories/category.repository';
import { ListingRepository } from './repositories/listing.repository';
import { ListingPhotoRepository } from './repositories/listing-photo.repository';
import { AvailabilityBlockRepository } from './repositories/availability-block.repository';

import { CategoriesService } from './services/categories.service';
import { ListingsService } from './services/listings.service';
import { AvailabilityService } from './services/availability.service';
import { ListingAttributeValidatorService } from './services/listing-attribute-validator.service';

import { CategoriesController } from './controllers/categories.controller';
import { ListingsController } from './controllers/listings.controller';

import { IsListingOwnerPolicy } from './policies/is-listing-owner.policy';

/**
 * Exports only services (CategoriesService, ListingsService,
 * AvailabilityService) — never repositories or entities — so BookingModule
 * (which needs listing price/category/ownership data) depends on Catalog's
 * public interface, not its persistence details. Same module-boundary rule
 * IdentityModule documents.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Category, Listing, ListingPhoto, AvailabilityBlock]),
    StorageModule,
    IdentityModule,
  ],
  controllers: [CategoriesController, ListingsController],
  providers: [
    CategoryRepository,
    ListingRepository,
    ListingPhotoRepository,
    AvailabilityBlockRepository,
    CategoriesService,
    ListingsService,
    AvailabilityService,
    ListingAttributeValidatorService,
    IsListingOwnerPolicy,
  ],
  exports: [CategoriesService, ListingsService, AvailabilityService],
})
export class CatalogModule {}
