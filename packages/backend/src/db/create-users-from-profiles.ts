import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../../data/hoppiness.db');

async function main() {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  const DEFAULT_PASSWORD = 'hoppiness2024';
  const hash = await bcrypt.hash(DEFAULT_PASSWORD, 12);
  const now = new Date().toISOString();

  const profiles: any[] = db.prepare(
    "SELECT id, email FROM profiles WHERE email IS NOT NULL AND email != ''"
  ).all();

  const existingUsers = new Set(
    db.prepare('SELECT id FROM users').all().map((r: any) => r.id)
  );

  console.log(`Profiles with email: ${profiles.length}`);
  console.log(`Existing users: ${existingUsers.size}`);

  const missing = profiles.filter(p => !existingUsers.has(p.id));
  console.log(`Need to create: ${missing.length} user accounts`);

  if (missing.length === 0) {
    console.log('Nothing to do!');
    db.close();
    return;
  }

  const insert = db.prepare(
    `INSERT OR IGNORE INTO users (id, email, password_hash, email_confirmed_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  db.exec('BEGIN TRANSACTION');
  let created = 0;
  for (const p of missing) {
    try {
      insert.run(p.id, p.email.toLowerCase(), hash, now, now, now);
      created++;
    } catch (err: any) {
      console.error(`  Error for ${p.email}: ${err.message}`);
    }
  }
  db.exec('COMMIT');

  console.log(`\nCreated ${created} user accounts.`);
  console.log(`Default password for all: ${DEFAULT_PASSWORD}`);
  console.log('\nUsers can change their password after logging in.');

  db.close();
}

main().catch(console.error);
