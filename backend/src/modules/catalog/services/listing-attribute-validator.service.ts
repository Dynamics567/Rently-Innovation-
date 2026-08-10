import { Injectable } from '@nestjs/common';
import Ajv, { ErrorObject } from 'ajv';
import { DomainException } from '@common/errors/domain.exception';
import { ErrorCode } from '@common/errors/error-codes.enum';
import { Category } from '../entities/category.entity';

/**
 * Validates `Listing.attributes` against its category's `attribute_schema`
 * (a JSON Schema) — the mechanism docs/ARCHITECTURE.md describes for letting
 * Admin add a category-specific field via data, not a migration. One Ajv
 * instance is reused across calls; each category's schema is compiled once.
 */
@Injectable()
export class ListingAttributeValidatorService {
  private readonly ajv = new Ajv({ allErrors: true, useDefaults: true });
  private readonly compiledCache = new Map<string, ReturnType<Ajv['compile']>>();

  validate(category: Category, attributes: Record<string, unknown>): void {
    const schema = category.attributeSchema;
    if (!schema || Object.keys(schema).length === 0) {
      return; // Category hasn't defined custom attributes yet — nothing to validate.
    }

    let validateFn = this.compiledCache.get(category.id);
    if (!validateFn) {
      validateFn = this.ajv.compile(schema);
      this.compiledCache.set(category.id, validateFn);
    }

    const valid = validateFn(attributes);
    if (!valid) {
      throw DomainException.unprocessable(
        ErrorCode.CATEGORY_ATTRIBUTE_INVALID,
        'One or more listing attributes are invalid for this category.',
        { errors: this.formatErrors(validateFn.errors) },
      );
    }
  }

  private formatErrors(errors?: ErrorObject[] | null) {
    return (errors ?? []).map((e) => ({ path: e.instancePath, message: e.message }));
  }

  /** Category schema was edited (admin) — drop the stale compiled validator. */
  invalidate(categoryId: string): void {
    this.compiledCache.delete(categoryId);
  }
}
