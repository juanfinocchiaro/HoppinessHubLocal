/**
 * Clean import: since SQLite table/column names match PG exactly,
 * we just parse COPY blocks and insert directly. No mapping needed.
 */
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../../data/hoppiness.db');
const dumpPath = process.argv[2] || 'c:\\Users\\Usuario\\Downloads\\hoppiness_backup.sql';

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = OFF');

const sqliteTables = new Set(
  db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r: any) => r.name)
);

console.log(`SQLite has ${sqliteTables.size} tables`);
console.log(`Reading PG dump: ${dumpPath}\n`);

const content = fs.readFileSync(dumpPath, 'utf-8');
const lines = content.split('\n');

function sanitize(val: string): any {
  if (val === '\\N') return null;
  if (val === 't') return 1;
  if (val === 'f') return 0;
  return val.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\\\/g, '\\');
}

let currentTable: string | null = null;
let currentCols: string[] = [];
let stmt: Database.Statement | null = null;
let rowCount = 0;
let totalRows = 0;
let tablesOk = 0;
let tablesSkipped: string[] = [];

function flush() {
  if (currentTable && rowCount > 0) {
    console.log(`  OK  ${currentTable}: ${rowCount} rows`);
    totalRows += rowCount;
    tablesOk++;
  }
  currentTable = null;
  currentCols = [];
  stmt = null;
  rowCount = 0;
}

db.exec('BEGIN TRANSACTION');

try {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('COPY "public".')) {
      flush();

      const m = line.match(/COPY "public"\."([^"]+)"\s*\(([^)]+)\)\s*FROM stdin;/);
      if (!m) continue;

      const tbl = m[1];
      const cols = m[2].split(',').map(c => c.trim().replace(/"/g, ''));

      if (!sqliteTables.has(tbl)) {
        tablesSkipped.push(tbl);
        currentTable = null;
        continue;
      }

      const tableCols = new Set(
        db.prepare(`PRAGMA table_info("${tbl}")`).all().map((c: any) => c.name)
      );

      const validIdx: number[] = [];
      const validCols: string[] = [];
      for (let j = 0; j < cols.length; j++) {
        if (tableCols.has(cols[j])) {
          validIdx.push(j);
          validCols.push(cols[j]);
        }
      }

      if (validCols.length === 0) {
        tablesSkipped.push(`${tbl} (no cols match)`);
        continue;
      }

      currentTable = tbl;
      currentCols = validCols;

      db.exec(`DELETE FROM "${tbl}"`);

      const ph = validCols.map(() => '?').join(',');
      const cn = validCols.map(c => `"${c}"`).join(',');
      try {
        stmt = db.prepare(`INSERT OR IGNORE INTO "${tbl}" (${cn}) VALUES (${ph})`);
      } catch (err: any) {
        console.log(`  ERR ${tbl}: ${err.message}`);
        currentTable = null;
        stmt = null;
      }
      continue;
    }

    if (line === '\\.' || line === '\\.') {
      flush();
      continue;
    }

    if (currentTable && stmt) {
      const vals = line.split('\t');
      if (vals.length < currentCols.length) continue;

      const findCopyLine = () => {
        for (let j = i - 1; j >= Math.max(0, i - 5000); j--) {
          if (lines[j].startsWith('COPY "public".')) return lines[j];
        }
        return null;
      };

      const copyLine = findCopyLine();
      if (!copyLine) continue;

      const cm = copyLine.match(/COPY "public"\."[^"]+"\s*\(([^)]+)\)/);
      if (!cm) continue;

      const allPgCols = cm[1].split(',').map(c => c.trim().replace(/"/g, ''));

      const row: any[] = [];
      for (const col of currentCols) {
        const idx = allPgCols.indexOf(col);
        if (idx >= 0 && idx < vals.length) {
          row.push(sanitize(vals[idx]));
        } else {
          row.push(null);
        }
      }

      try {
        stmt.run(...row);
        rowCount++;
      } catch (err: any) {
        if (rowCount === 0) {
          console.log(`  WARN ${currentTable}: ${err.message}`);
        }
      }
    }
  }

  flush();
  db.exec('COMMIT');

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Import complete!`);
  console.log(`  Tables imported: ${tablesOk}`);
  console.log(`  Total rows: ${totalRows}`);
  if (tablesSkipped.length > 0) {
    console.log(`  Skipped (${tablesSkipped.length}): ${tablesSkipped.join(', ')}`);
  }
  console.log('='.repeat(50));

} catch (err) {
  db.exec('ROLLBACK');
  console.error('IMPORT FAILED:', err);
  process.exit(1);
}

db.close();
