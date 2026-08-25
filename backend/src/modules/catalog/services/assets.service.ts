import { Injectable } from '@nestjs/common';
import { AssetRepository } from '../repositories/asset.repository';
import { Asset } from '../entities/asset.entity';
import { CreateAssetDto } from '../dto/create-asset.dto';
import { UpdateAssetDto } from '../dto/update-asset.dto';
import { ListingCondition } from '../enums/listing.enums';

/**
 * Owns per-unit inventory (Asset) — a listing with zero Asset rows behaves
 * exactly as before this existed (implicit single unit). Ownership of the
 * parent listing is enforced by IsListingOwnerPolicy at the controller,
 * same as every other listing-scoped write — this service trusts its caller.
 */
@Injectable()
export class AssetsService {
  constructor(private readonly assetRepository: AssetRepository) {}

  async create(listingId: string, dto: CreateAssetDto): Promise<Asset> {
    const asset = this.assetRepository.create({
      listingId,
      label: dto.label,
      condition: dto.condition ?? ListingCondition.GOOD,
      notes: dto.notes ?? null,
    });
    return this.assetRepository.save(asset);
  }

  async listForListing(listingId: string): Promise<Asset[]> {
    return this.assetRepository.findByListing(listingId);
  }

  /** [Booking] The units a listing can currently be booked against — excludes MAINTENANCE/RETIRED. */
  async getActiveForListing(listingId: string): Promise<Asset[]> {
    return this.assetRepository.findActiveByListing(listingId);
  }

  async countForListing(listingId: string): Promise<number> {
    return this.assetRepository.countByListing(listingId);
  }

  async update(id: string, dto: UpdateAssetDto): Promise<Asset> {
    const asset = await this.assetRepository.findByIdOrFail(id, 'Asset');
    Object.assign(asset, dto);
    return this.assetRepository.save(asset);
  }

  async findByIdOrFail(id: string): Promise<Asset> {
    return this.assetRepository.findByIdOrFail(id, 'Asset');
  }
}
