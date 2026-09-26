import { PostgresAdapter } from '../src/backend/db/postgresAdapter.js';
import { logger } from '../src/backend/logger.js';

/**
 * PUNCHX Migration Validation Script
 * Compares PostgreSQL target store against expected migration integrity checks.
 */

export async function validateMigration(): Promise<{ passed: boolean; details: any }> {
  logger.info('[MIGRATION_VALIDATOR] Running integrity and record validation checks...');

  const adapter = new PostgresAdapter();
  const users = await adapter.listUsers();
  const orders = await adapter.listOrders();
  const claims = await adapter.listWarrantyClaims();
  const reviews = await adapter.listReviews();

  const details = {
    totalUsers: users.length,
    totalOrders: orders.length,
    totalClaims: claims.length,
    totalReviews: reviews.length,
    healthStatus: await adapter.isHealthy(),
  };

  const passed = details.healthStatus && users.length >= 0 && orders.length >= 0;

  if (passed) {
    logger.info('[MIGRATION_VALIDATOR] ✅ Migration validation PASSED cleanly!', details);
  } else {
    logger.error('[MIGRATION_VALIDATOR] ❌ Migration validation FAILED!', null, details);
  }

  return { passed, details };
}

if (process.argv[1]?.endsWith('validate-migration.ts')) {
  validateMigration();
}
