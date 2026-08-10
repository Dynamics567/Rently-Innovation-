import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '@common/base/base.entity';

/**
 * `attributeSchema` is a JSON Schema (draft-07) describing this category's
 * custom listing fields — e.g. Real Estate requires `square_footage: number`.
 * Validated against `Listing.attributes` at the API boundary
 * (ListingAttributeValidatorService), not via a migration — see
 * docs/ARCHITECTURE.md's "JSONB + JSON Schema, not EAV" rationale.
 */
@Entity('categories')
export class Category extends BaseEntity {
  @ManyToOne(() => Category, (category) => category.children, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'parent_id' })
  parent?: Category | null;

  @Column({ name: 'parent_id', nullable: true })
  parentId?: string | null;

  @OneToMany(() => Category, (category) => category.parent)
  children: Category[];

  @Column({ type: 'text' })
  name: string;

  @Index({ unique: true })
  @Column({ type: 'text' })
  slug: string;

  @Column({ name: 'attribute_schema', type: 'jsonb', default: () => "'{}'" })
  attributeSchema: Record<string, unknown>;

  @Column({ name: 'commission_rate_bps', type: 'int', default: 500 })
  commissionRateBps: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}
