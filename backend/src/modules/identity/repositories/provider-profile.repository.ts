import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '@common/base/base.repository';
import { CursorPage } from '@common/dto/cursor-pagination.dto';
import { ProviderProfile } from '../entities/provider-profile.entity';
import { ProviderVerificationStatus } from '../enums/verification-status.enum';

interface Cursor {
  createdAt: string;
  id: string;
}

function encodeCursor(profile: ProviderProfile): string {
  return Buffer.from(
    JSON.stringify({ createdAt: profile.createdAt.toISOString(), id: profile.id }),
  ).toString('base64');
}

function decodeCursor(cursor: string): Cursor {
  return JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
}

@Injectable()
export class ProviderProfileRepository extends BaseRepository<ProviderProfile> {
  constructor(@InjectRepository(ProviderProfile) repository: Repository<ProviderProfile>) {
    super(repository);
  }

  /**
   * [Admin] All providers, any verification status — unlike
   * findPendingVerification() which is scoped to the verification queue
   * only. Matches against the joined user's name/email too, since
   * businessName is optional (individual providers have none).
   */
  async searchForAdmin(
    query: string | undefined,
    cursor?: string,
    limit = 20,
  ): Promise<CursorPage<ProviderProfile>> {
    const qb = this.repository
      .createQueryBuilder('profile')
      .leftJoinAndSelect('profile.user', 'user');
    if (query) {
      qb.andWhere('(profile.businessName ILIKE :q OR user.fullName ILIKE :q OR user.email ILIKE :q)', {
        q: `%${query}%`,
      });
    }
    qb.orderBy('profile.createdAt', 'DESC').addOrderBy('profile.id', 'DESC');
    if (cursor) {
      const { createdAt, id } = decodeCursor(cursor);
      qb.andWhere('(profile.createdAt, profile.id) < (:cAt, :cId)', { cAt: createdAt, cId: id });
    }
    const rows = await qb.take(limit + 1).getMany();
    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;
    return { data, meta: { hasMore, nextCursor: hasMore ? encodeCursor(data[data.length - 1]) : null } };
  }

  async findByUserId(userId: string): Promise<ProviderProfile | null> {
    return this.repository.findOne({ where: { userId } });
  }

  /** Backs the public GET /providers/:id profile — needs the linked User for the individual-provider display-name fallback. */
  async findByIdWithUser(id: string): Promise<ProviderProfile | null> {
    return this.repository.findOne({ where: { id }, relations: ['user'] });
  }

  /** Backs GET /admin/providers/verification-queue (PRD FR9.1). */
  async findPendingVerification(): Promise<ProviderProfile[]> {
    return this.repository.find({
      where: { verificationStatus: ProviderVerificationStatus.PENDING },
      relations: ['verificationDocuments', 'user'],
      order: { createdAt: 'ASC' },
    });
  }

  /** Atomic increment — avoids a read-modify-write race between two bookings completing for the same provider at once. */
  async incrementCompletedBookings(id: string): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(ProviderProfile)
      .set({ totalCompletedBookings: () => '"total_completed_bookings" + 1' })
      .where('id = :id', { id })
      .execute();
  }
}
