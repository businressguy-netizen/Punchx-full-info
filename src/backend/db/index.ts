import { IDatabaseAdapter } from './dbAdapter.js';
import { FirebaseAdapter } from './firebaseAdapter.js';
import { PostgresAdapter } from './postgresAdapter.js';
import { logger } from '../logger.js';

let activeDatabaseAdapter: IDatabaseAdapter;

export function getDatabaseAdapter(): IDatabaseAdapter {
  if (!activeDatabaseAdapter) {
    const provider = (process.env.PUNCHX_DB_PROVIDER || '').toLowerCase();
    const hasSupabaseConnection = Boolean(
      process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL
    );

    if (provider === 'supabase') {
      if (!hasSupabaseConnection) {
        throw new Error(
          'PUNCHX_DB_PROVIDER=supabase requires SUPABASE_DB_URL (or DATABASE_URL). Refusing to silently fall back to Firebase.'
        );
      }
      logger.info('Initializing PUNCHX Database Provider: Supabase PostgreSQL');
      activeDatabaseAdapter = new PostgresAdapter();
    } else {
      logger.info('Initializing PUNCHX Database Provider: Firebase Firestore (migration-safe default)');
      activeDatabaseAdapter = new FirebaseAdapter();
    }
  }
  return activeDatabaseAdapter;
}

export const dbAdapter = getDatabaseAdapter();
