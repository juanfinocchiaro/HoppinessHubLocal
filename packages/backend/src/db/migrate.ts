import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db } from './connection.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(__dirname, './migrations');

console.log('Running migrations...');
migrate(db, { migrationsFolder });
console.log('Migrations complete.');
