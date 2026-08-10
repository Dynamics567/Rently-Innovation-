import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { BaseRepository } from '@common/base/base.repository';
import { Category } from '../entities/category.entity';

@Injectable()
export class CategoryRepository extends BaseRepository<Category> {
  constructor(@InjectRepository(Category) repository: Repository<Category>) {
    super(repository);
  }

  async findAllActive(): Promise<Category[]> {
    return this.repository.find({ where: { isActive: true }, order: { name: 'ASC' } });
  }

  async findBySlug(slug: string): Promise<Category | null> {
    return this.repository.findOne({ where: { slug } });
  }

  /** Top-level categories only — used for the browse taxonomy tree. */
  async findRoots(): Promise<Category[]> {
    return this.repository.find({
      where: { parentId: IsNull(), isActive: true },
      order: { name: 'ASC' },
    });
  }
}
