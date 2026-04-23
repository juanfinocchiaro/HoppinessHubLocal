import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.resolve(__dirname, '../../data/hoppiness.db'));

const users = db.prepare("SELECT id, email, password_hash FROM users LIMIT 5").all();
console.log('Users sample:');
for (const u of users as any[]) {
  console.log(`  ${u.email} - hash: ${u.password_hash ? u.password_hash.substring(0, 20) + '...' : 'NULL'}`);
}

const total = db.prepare("SELECT COUNT(*) as c FROM users").get() as any;
console.log(`Total users: ${total.c}`);

const profiles = db.prepare("SELECT id, email, full_name FROM profiles LIMIT 5").all();
console.log('\nProfiles sample:');
for (const p of profiles as any[]) {
  console.log(`  ${p.email} - ${p.full_name}`);
}

const matchTest = db.prepare("SELECT u.email as u_email, p.email as p_email, p.full_name FROM users u JOIN profiles p ON u.id = p.id LIMIT 5").all();
console.log('\nJoined users+profiles:');
for (const m of matchTest as any[]) {
  console.log(`  user: ${m.u_email} | profile: ${m.p_email} | name: ${m.full_name}`);
}

db.close();
