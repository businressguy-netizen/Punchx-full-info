import { IDatabaseAdapter } from './dbAdapter.js';
import { FirebaseAdapter } from './firebaseAdapter.js';
import { logger } from '../logger.js';

let activeDatabaseAdapter: IDatabaseAdapter;

export function getDatabaseAdapter(): IDatabaseAdapter {
  if (!activeDatabaseAdapter) {
    logger.info('Initializing PUNCHX Database Provider: Firebase Firestore');
    activeDatabaseAdapter = new FirebaseAdapter();
  }
  return activeDatabaseAdapter;
}

export const dbAdapter = getDatabaseAdapter();

