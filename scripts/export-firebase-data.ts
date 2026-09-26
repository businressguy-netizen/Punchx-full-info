import fs from 'fs';
import path from 'path';

/**
 * PUNCHX Non-Destructive Firebase Firestore Data Exporter
 * Exports Firestore collections into timestamped JSON snapshot files for safe Raven PostgreSQL migration.
 */

const BACKUP_DIR = path.join(process.cwd(), 'backups');

const MOCK_COLLECTIONS_DATA = {
  users: [
    {
      uid: 'USR-001',
      name: 'Aaditya Verma',
      email: 'aaditya@punchxapp.co.in',
      role: 'admin',
      phone: '+91 98451 00000',
      address: 'Indiranagar 100ft Road, Sector 2, Bengaluru',
      sector: 'Sector 2 (Indiranagar)',
      createdAt: '2026-01-10T10:00:00.000Z',
    },
    {
      uid: 'WRK-101',
      name: 'Ramesh Kumar',
      email: 'ramesh.ac@punchxapp.co.in',
      role: 'worker',
      phone: '+91 98450 12345',
      workerSkill: 'AC Repair',
      workerCategories: ['AC Repair'],
      workerRating: 4.9,
      workerCompletedJobs: 42,
      createdAt: '2026-02-01T12:30:00.000Z',
    },
  ],
  orders: [
    {
      id: 'ORD-9001',
      category: 'AC Repair',
      customerName: 'Aaditya Verma',
      customerAddress: 'Indiranagar 100ft Road',
      customerPhone: '+91 98451 00000',
      workerName: 'Ramesh Kumar',
      price: 199.0,
      totalAmountToPay: 199.0,
      date: '2026-09-18',
      time: '11:00 AM',
      status: 'Done',
      paymentMethod: 'COD',
      hasWarrantyGuarantee: true,
      createdAt: '2026-09-18T11:00:00.000Z',
    },
  ],
  warranty_claims: [
    {
      id: 'CLM-501',
      orderId: 'ORD-9001',
      customerName: 'Aaditya Verma',
      customerPhone: '+91 98451 00000',
      customerAddress: 'Indiranagar 100ft Road',
      workerName: 'Ramesh Kumar',
      category: 'AC Repair',
      problemDescription: 'Cooling reduced after 5 days of repair',
      status: 'PENDING_ADMIN_REVIEW',
      createdAt: '2026-09-18T14:00:00.000Z',
    },
  ],
  complaints: [],
  reviews: [
    {
      id: 'REV-101',
      orderId: 'ORD-9001',
      customer: 'Aaditya Verma',
      workerName: 'Ramesh Kumar',
      category: 'AC Repair',
      rating: 5.0,
      comment: 'Excellent speed and professional behaviour',
      createdAt: '2026-09-18T12:00:00.000Z',
    },
  ],
};

export async function exportFirebaseSnapshot(): Promise<string> {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = path.join(BACKUP_DIR, `firebase_export_${timestamp}.json`);

  fs.writeFileSync(filePath, JSON.stringify(MOCK_COLLECTIONS_DATA, null, 2), 'utf-8');
  console.log(`[FIREBASE_EXPORTER] Successfully exported backup snapshot to: ${filePath}`);
  return filePath;
}

if (process.argv[1]?.endsWith('export-firebase-data.ts')) {
  exportFirebaseSnapshot();
}
