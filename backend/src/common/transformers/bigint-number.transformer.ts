import { ValueTransformer } from 'typeorm';

/**
 * Postgres `bigint` columns come back from `pg` as strings (JS `number` can't
 * safely represent the full bigint range). Every money column in this system
 * (`*_minor`, integer kobo) is well within Number.MAX_SAFE_INTEGER in
 * practice, so we transform back to `number` at the entity boundary rather
 * than pushing string-typed money through every Service and DTO.
 */
export const BigIntNumberTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) =>
    value === null || value === undefined ? value : parseInt(value, 10),
};
