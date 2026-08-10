import { Injectable } from '@nestjs/common';
import { DomainException } from '@common/errors/domain.exception';
import { ErrorCode } from '@common/errors/error-codes.enum';
import { CategoryRepository } from '../repositories/category.repository';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { Category } from '../entities/category.entity';
import { ListingAttributeValidatorService } from './listing-attribute-validator.service';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly categoryRepository: CategoryRepository,
    private readonly attributeValidator: ListingAttributeValidatorService,
  ) {}

  async findAll(): Promise<Category[]> {
    return this.categoryRepository.findAllActive();
  }

  async getBySlugOrFail(slug: string): Promise<Category> {
    const category = await this.categoryRepository.findBySlug(slug);
    if (!category) {
      throw DomainException.notFound(
        ErrorCode.CATEGORY_NOT_FOUND,
        `Category "${slug}" was not found.`,
      );
    }
    return category;
  }

  async getByIdOrFail(id: string): Promise<Category> {
    return this.categoryRepository.findByIdOrFail(id, 'Category');
  }

  /** [Admin] Create/edit — the only place category taxonomy changes, per docs/API_DESIGN.md. */
  async create(dto: CreateCategoryDto): Promise<Category> {
    const category = this.categoryRepository.create({
      parentId: dto.parentId ?? null,
      name: dto.name,
      slug: dto.slug,
      attributeSchema: dto.attributeSchema ?? {},
      commissionRateBps: dto.commissionRateBps ?? 500,
    });
    return this.categoryRepository.save(category);
  }

  async update(id: string, dto: Partial<CreateCategoryDto>): Promise<Category> {
    const category = await this.getByIdOrFail(id);
    Object.assign(category, dto);
    const saved = await this.categoryRepository.save(category);
    this.attributeValidator.invalidate(id);
    return saved;
  }

  assertActive(category: Category): void {
    if (!category.isActive) {
      throw DomainException.conflict(
        ErrorCode.CATEGORY_INACTIVE,
        `Category "${category.slug}" is no longer active.`,
      );
    }
  }
}
