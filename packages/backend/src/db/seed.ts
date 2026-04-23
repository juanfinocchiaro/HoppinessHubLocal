import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../../data/hoppiness.db');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

async function seed() {
  console.log('Seeding database...');

  const adminId = crypto.randomUUID();
  const branchId = crypto.randomUUID();
  const now = new Date().toISOString();
  const passwordHash = await bcrypt.hash('admin123', 12);

  const superadminRoleId = crypto.randomUUID();
  const managerRoleId = crypto.randomUUID();
  const staffRoleId = crypto.randomUUID();
  const hrRoleId = crypto.randomUUID();
  const cashierRoleId = crypto.randomUUID();

  db.exec('BEGIN TRANSACTION');

  try {
    db.prepare(`INSERT OR IGNORE INTO users (id, email, password_hash, email_confirmed_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)`).run(adminId, 'admin@hoppiness.com', passwordHash, now, now, now);

    db.prepare(`INSERT OR IGNORE INTO profiles (id, email, full_name, is_active, onboarding_completed, created_at, updated_at)
      VALUES (?, ?, ?, 1, 1, ?, ?)`).run(adminId, 'admin@hoppiness.com', 'Administrador', now, now);

    const rolesData = [
      [superadminRoleId, 'superadmin', 'Super Administrador', 'Acceso total a la plataforma', 'brand', 1],
      [managerRoleId, 'encargado', 'Encargado', 'Gestión del local', 'branch', 1],
      [staffRoleId, 'empleado', 'Empleado', 'Staff operativo', 'branch', 1],
      [hrRoleId, 'rrhh', 'Recursos Humanos', 'Gestión de personal', 'branch', 1],
      [cashierRoleId, 'cajero', 'Cajero', 'Operaciones de caja', 'branch', 1],
    ];

    const insertRole = db.prepare(`INSERT OR IGNORE INTO roles (id, key, label, description, scope, is_system) VALUES (?, ?, ?, ?, ?, ?)`);
    for (const r of rolesData) {
      insertRole.run(...r);
    }

    db.prepare(`INSERT OR IGNORE INTO user_role_assignments (id, user_id, role_id, branch_id, is_active, created_at, updated_at)
      VALUES (?, ?, ?, NULL, 1, ?, ?)`).run(crypto.randomUUID(), adminId, superadminRoleId, now, now);

    db.prepare(`INSERT OR IGNORE INTO branches (id, name, slug, address, city, is_active, is_open, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, 1, ?, ?)`).run(branchId, 'Hoppiness Casa Central', 'casa-central', 'Av. Hipólito Yrigoyen 100', 'Córdoba', now, now);

    db.prepare(`INSERT OR IGNORE INTO user_role_assignments (id, user_id, role_id, branch_id, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, ?, ?)`).run(crypto.randomUUID(), adminId, managerRoleId, branchId, now, now);

    db.prepare(`INSERT OR IGNORE INTO pos_config (id, branch_id, created_at, updated_at)
      VALUES (?, ?, ?, ?)`).run(crypto.randomUUID(), branchId, now, now);

    db.prepare(`INSERT OR IGNORE INTO webapp_config (id, branch_id, slug, is_active, created_at, updated_at)
      VALUES (?, ?, 'casa-central', 1, ?, ?)`).run(crypto.randomUUID(), branchId, now, now);

    const catBurgerId = crypto.randomUUID();
    const catBebidaId = crypto.randomUUID();
    db.prepare(`INSERT OR IGNORE INTO menu_categories (id, name, sort_order, is_active, created_at, updated_at)
      VALUES (?, ?, ?, 1, ?, ?)`).run(catBurgerId, 'Hamburguesas', 1, now, now);
    db.prepare(`INSERT OR IGNORE INTO menu_categories (id, name, sort_order, is_active, created_at, updated_at)
      VALUES (?, ?, ?, 1, ?, ?)`).run(catBebidaId, 'Bebidas', 2, now, now);

    db.prepare(`INSERT OR IGNORE INTO menu_items (id, name, description, category_id, base_price, is_active, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, 1, ?, ?)`).run(crypto.randomUUID(), 'Hoppiness Clásica', 'Medallón de carne, cheddar, panceta, cebolla crispy, salsa especial', catBurgerId, 5500, now, now);
    db.prepare(`INSERT OR IGNORE INTO menu_items (id, name, description, category_id, base_price, is_active, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, 2, ?, ?)`).run(crypto.randomUUID(), 'Hoppiness Doble', 'Doble medallón, doble cheddar, panceta, cebolla crispy, salsa especial', catBurgerId, 7500, now, now);
    db.prepare(`INSERT OR IGNORE INTO menu_items (id, name, description, category_id, base_price, is_active, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, 1, ?, ?)`).run(crypto.randomUUID(), 'Coca-Cola 500ml', 'Coca-Cola línea regular', catBebidaId, 1500, now, now);

    db.exec('COMMIT');
    console.log('Seed complete!');
    console.log(`  Admin user: admin@hoppiness.com / admin123`);
    console.log(`  Branch: Hoppiness Casa Central (${branchId})`);
    console.log(`  Roles: superadmin, encargado, empleado, rrhh, cajero`);
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  db.close();
}

seed().catch(console.error);
