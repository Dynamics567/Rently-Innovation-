import { AppDataSource } from '../data-source';
import { Category } from '@modules/catalog/entities/category.entity';
import { CATEGORY_SEED_DATA } from './categories.seed-data';

/**
 * Idempotent — upserts by slug, so `npm run seed` is safe to run again after
 * a redeploy without duplicating categories.
 */
async function run() {
  await AppDataSource.initialize();
  const repo = AppDataSource.getRepository(Category);

  for (const data of CATEGORY_SEED_DATA) {
    const existing = await repo.findOne({ where: { slug: data.slug } });
    if (existing) {
      existing.name = data.name;
      existing.commissionRateBps = data.commissionRateBps;
      await repo.save(existing);
    } else {
      await repo.save(repo.create({ ...data, attributeSchema: {}, isActive: true }));
    }
    // eslint-disable-next-line no-console
    console.log(`seeded category: ${data.slug}`);
  }

  await AppDataSource.destroy();
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Seed failed:', err);
  process.exit(1);
});
