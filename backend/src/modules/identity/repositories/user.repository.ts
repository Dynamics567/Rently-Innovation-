import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '@common/base/base.repository';
import { CursorPage } from '@common/dto/cursor-pagination.dto';
import { User } from '../entities/user.entity';

interface Cursor {
  createdAt: string;
  id: string;
}

function encodeCursor(user: User): string {
  return Buffer.from(JSON.stringify({ createdAt: user.createdAt.toISOString(), id: user.id })).toString(
    'base64',
  );
}

function decodeCursor(cursor: string): Cursor {
  return JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
}

@Injectable()
export class UserRepository extends BaseRepository<User> {
  constructor(@InjectRepository(User) repository: Repository<User>) {
    super(repository);
  }

  /**
   * [Admin] Partial match on name/email, paginated — the Customers view's
   * search, unlike `findByEmail`'s exact lookup used for provider grant/
   * lookup flows. Case-insensitive via ILIKE.
   */
  async searchForAdmin(query: string | undefined, cursor?: string, limit = 20): Promise<CursorPage<User>> {
    const qb = this.repository.createQueryBuilder('user');
    if (query) {
      qb.andWhere('(user.fullName ILIKE :q OR user.email ILIKE :q)', { q: `%${query}%` });
    }
    qb.orderBy('user.createdAt', 'DESC').addOrderBy('user.id', 'DESC');
    if (cursor) {
      const { createdAt, id } = decodeCursor(cursor);
      qb.andWhere('(user.createdAt, user.id) < (:cAt, :cId)', { cAt: createdAt, cId: id });
    }
    const rows = await qb.take(limit + 1).getMany();
    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;
    return { data, meta: { hasMore, nextCursor: hasMore ? encodeCursor(data[data.length - 1]) : null } };
  }

  /** [Admin] Overview's "total users" stat — a real count, not a page-length approximation. */
  async countAll(): Promise<number> {
    return this.repository.count();
  }

  /** [Admin Team view] Every account with admin or super_admin access. */
  async findAdmins(): Promise<User[]> {
    return this.repository
      .createQueryBuilder('user')
      .where("'admin' = ANY(user.roles) OR 'super_admin' = ANY(user.roles)")
      .orderBy('user.fullName', 'ASC')
      .getMany();
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({ where: { email } });
  }

  async findByPhone(phone: string): Promise<User | null> {
    return this.repository.findOne({ where: { phone } });
  }

  async findByEmailOrPhone(identifier: { email?: string; phone?: string }): Promise<User | null> {
    if (identifier.email) return this.findByEmail(identifier.email);
    if (identifier.phone) return this.findByPhone(identifier.phone);
    return null;
  }

  async findWithProviderProfile(id: string): Promise<User | null> {
    return this.repository.findOne({ where: { id }, relations: ['providerProfile'] });
  }
}
