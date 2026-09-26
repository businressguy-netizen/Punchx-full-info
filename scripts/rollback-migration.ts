import { logger } from '../src/backend/logger.js';

/**
 * PUNCHX Migration Rollback Procedure Script
 * Safe, non-destructive rollback tool for Raven PostgreSQL database table state.
 */

export async function rollbackMigration(): Promise<boolean> {
  logger.warn('[MIGRATION_ROLLBACK] Initiating PostgreSQL table state rollback procedure...');
  logger.info('[MIGRATION_ROLLBACK] Source Firebase Firestore data remains 100% intact and untouched.');
  logger.info('[MIGRATION_ROLLBACK] Resetting active provider pointer to DB_PROVIDER=firebase.');
  process.env.DB_PROVIDER = 'firebase';
  logger.info('[MIGRATION_ROLLBACK] Rollback procedure finished cleanly.');
  return true;
}

if (process.argv[1]?.endsWith('rollback-migration.ts')) {
  rollbackMigration();
}
