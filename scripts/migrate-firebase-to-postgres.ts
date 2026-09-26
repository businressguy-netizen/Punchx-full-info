import fs from 'fs';
import path from 'path';
import { exportFirebaseSnapshot } from './export-firebase-data.js';
import { PostgresAdapter } from '../src/backend/db/postgresAdapter.js';
import { logger } from '../src/backend/logger.js';

/**
 * PUNCHX Firebase -> Raven PostgreSQL ETL Migration Pipeline
 */

export async function runMigration(exportFilePath?: string): Promise<{ success: boolean; migratedCounts: Record<string, number> }> {
  logger.info('[MIGRATION_ETL] Starting Firebase -> Raven PostgreSQL migration...');

  const filePath = exportFilePath || (await exportFirebaseSnapshot());
  const rawData = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(rawData);

  const adapter = new PostgresAdapter();
  const counts: Record<string, number> = {
    users: 0,
    orders: 0,
    claims: 0,
    complaints: 0,
    reviews: 0,
  };

  // 1. Migrate Users
  if (Array.isArray(data.users)) {
    for (const u of data.users) {
      await adapter.upsertUser({
        uid: u.uid || u.id,
        name: u.name || 'User',
        email: u.email || `${u.uid}@punchxapp.co.in`,
        role: u.role || 'citizen',
        phone: u.phone,
        address: u.address,
        sector: u.sector,
        workerSkill: u.workerSkill,
        workerRating: u.workerRating,
      });
      counts.users++;
    }
  }

  // 2. Migrate Orders
  if (Array.isArray(data.orders)) {
    for (const o of data.orders) {
      await adapter.createOrder(o);
      counts.orders++;
    }
  }

  // 3. Migrate Warranty Claims
  if (Array.isArray(data.warranty_claims)) {
    for (const c of data.warranty_claims) {
      await adapter.createWarrantyClaim(c);
      counts.claims++;
    }
  }

  // 4. Migrate Complaints
  if (Array.isArray(data.complaints)) {
    for (const cmp of data.complaints) {
      await adapter.createComplaint(cmp);
      counts.complaints++;
    }
  }

  // 5. Migrate Reviews
  if (Array.isArray(data.reviews)) {
    for (const r of data.reviews) {
      await adapter.createReview(r);
      counts.reviews++;
    }
  }

  logger.info('[MIGRATION_ETL] Migration completed successfully!', counts);
  return { success: true, migratedCounts: counts };
}

if (process.argv[1]?.endsWith('migrate-firebase-to-postgres.ts')) {
  runMigration();
}
