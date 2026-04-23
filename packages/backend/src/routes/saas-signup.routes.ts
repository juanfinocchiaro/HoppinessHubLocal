import { Router } from 'express';
import { sqlite } from '../db/connection.js';
import { AppError } from '../middleware/errorHandler.js';
import { generateTokens } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface BusinessPreset {
  label: string;
  categories: string[];
  modifier_groups: Array<{
    name: string;
    min_selected: number;
    max_selected: number | null;
    is_required: boolean;
    options: string[];
  }>;
  sample_products: Array<{
    name: string;
    category: string;
    base_price: number;
    description?: string;
  }>;
  channels: string[];
}

async function loadPresets(): Promise<Record<string, BusinessPreset>> {
  const presetsPath = path.resolve(__dirname, '../config/business_type_presets.json');
  const raw = await readFile(presetsPath, 'utf-8');
  return JSON.parse(raw);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const router = Router();

// POST /api/saas/signup
// Creates a new account + branch + user + trialing subscription + preset data
router.post('/signup', async (req, res, next) => {
  try {
    const { email, password, business_name, business_type, country } = req.body as {
      email: string;
      password: string;
      business_name: string;
      business_type: string;
      country?: string;
    };

    if (!email || !password || !business_name || !business_type) {
      throw new AppError(400, 'email, password, business_name, y business_type son requeridos');
    }
    if (password.length < 6) throw new AppError(400, 'La contraseña debe tener al menos 6 caracteres');

    const existing = sqlite.prepare(`SELECT id FROM users WHERE email = ?`).get(email.toLowerCase().trim());
    if (existing) throw new AppError(409, 'El email ya está registrado');

    const presets = await loadPresets();
    const preset = presets[business_type];
    if (!preset) throw new AppError(400, `Tipo de negocio desconocido: ${business_type}`);

    const currencyMap: Record<string, string> = { AR: 'ARS', MX: 'MXN', CL: 'CLP', CO: 'COP', UY: 'UYU' };
    const timezoneMap: Record<string, string> = {
      AR: 'America/Argentina/Buenos_Aires',
      MX: 'America/Mexico_City',
      CL: 'America/Santiago',
      CO: 'America/Bogota',
      UY: 'America/Montevideo',
    };
    const countryCode = (country ?? 'AR').toUpperCase();
    const now = new Date().toISOString();
    const trialEndsAt = new Date(Date.now() + 14 * 86_400_000).toISOString();

    // 1. Create user + profile
    const userId = randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);

    sqlite.prepare(`
      INSERT INTO users (id, email, password_hash, email_confirmed_at, last_sign_in_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(userId, email.toLowerCase().trim(), passwordHash, now, now, now, now);

    sqlite.prepare(`
      INSERT INTO profiles (id, full_name, email, is_active, created_at, updated_at)
      VALUES (?, ?, ?, 1, ?, ?)
    `).run(userId, business_name, email.toLowerCase().trim(), now, now);

    // 2. Create account
    const accountId = randomUUID();
    const baseSlug = slugify(business_name);
    let slug = baseSlug;
    let slugSuffix = 1;
    while (true) {
      const taken = sqlite.prepare(`SELECT id FROM accounts WHERE slug = ?`).get(slug);
      if (!taken) break;
      slug = `${baseSlug}-${slugSuffix++}`;
    }

    sqlite.prepare(`
      INSERT INTO accounts (id, name, slug, country_code, currency_code, timezone, business_type, is_grandfathered, billing_email, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
    `).run(accountId, business_name, slug, countryCode, currencyMap[countryCode] ?? 'ARS',
      timezoneMap[countryCode] ?? 'America/Argentina/Buenos_Aires', business_type,
      email.toLowerCase().trim(), now, now);

    // 3. Create first branch / location
    const branchId = randomUUID();
    sqlite.prepare(`
      INSERT INTO branches (id, account_id, name, is_active, slug, created_at, updated_at)
      VALUES (?, ?, ?, 1, ?, ?, ?)
    `).run(branchId, accountId, business_name, slug, now, now);

    // 4. Assign superadmin role to user for this account
    const superadminRole = sqlite.prepare(`SELECT id FROM roles WHERE key = 'superadmin'`).get() as { id: string } | undefined;

    if (superadminRole) {
      sqlite.prepare(`
        INSERT INTO user_role_assignments (id, user_id, role_id, branch_id, is_active, created_at)
        VALUES (?, ?, ?, ?, 1, ?)
      `).run(randomUUID(), userId, superadminRole.id, branchId, now);
    }

    // 5. Create trialing subscription on starter plan
    const starterPlanRow = sqlite.prepare(`SELECT id FROM plans WHERE slug = 'starter'`).get() as { id: string } | undefined;
    const starterPlan = starterPlanRow ? [{ id: starterPlanRow.id }] : [];

    if (starterPlan.length > 0) {
      const subId = randomUUID();
      sqlite.prepare(`
        INSERT INTO subscriptions (id, account_id, plan_id, status, trial_ends_at, billing_cycle, cancel_at_period_end, created_at, updated_at)
        VALUES (?, ?, ?, 'trialing', ?, 'monthly', 0, ?, ?)
      `).run(subId, accountId, starterPlan[0].id, trialEndsAt, now, now);

      // Seed feature flags from starter plan
      const planRow = sqlite.prepare(`SELECT features_json FROM plans WHERE slug = 'starter'`).get() as { features_json: string } | undefined;
      const features: string[] = planRow ? JSON.parse(planRow.features_json) : [];
      const insertFlag = sqlite.prepare(`
        INSERT OR IGNORE INTO feature_flags (id, account_id, feature_slug, is_enabled, source, created_at, updated_at)
        VALUES (?, ?, ?, 1, 'plan', ?, ?)
      `);
      for (const slug of features) {
        insertFlag.run(randomUUID(), accountId, slug, now, now);
      }
    }

    // 6. Seed preset data (categories, modifier groups, sample products)
    seedPreset(branchId, accountId, preset, now);

    // 7. Generate tokens
    const tokens = generateTokens({ userId, email: email.toLowerCase().trim(), accountId } as any);
    const profile = sqlite.prepare(`SELECT * FROM profiles WHERE id = ?`).get(userId);

    res.status(201).json({
      data: {
        user: profile,
        account_id: accountId,
        branch_id: branchId,
        trial_ends_at: trialEndsAt,
        tokens,
      },
    });
  } catch (err) {
    next(err);
  }
});

function seedPreset(branchId: string, _accountId: string, preset: BusinessPreset, now: string) {

  // Check if menu_categories table exists
  const catTableExists = sqlite.prepare(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='menu_categories'`
  ).get();
  if (!catTableExists) return;

  // Seed categories
  const categoryIds: Record<string, string> = {};
  for (const [idx, catName] of preset.categories.entries()) {
    const catId = randomUUID();
    categoryIds[catName] = catId;
    sqlite.prepare(`
      INSERT OR IGNORE INTO menu_categories (id, name, sort_order, is_active, created_at, updated_at)
      VALUES (?, ?, ?, 1, ?, ?)
    `).run(catId, catName, idx, now, now);
  }

  // Check if menu_items table exists
  const itemTableExists = sqlite.prepare(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='menu_items'`
  ).get();
  if (!itemTableExists) return;

  // Seed sample products
  for (const [idx, product] of preset.sample_products.entries()) {
    const itemId = randomUUID();
    sqlite.prepare(`
      INSERT OR IGNORE INTO menu_items (id, name, category_id, base_price, is_active, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, ?, ?, ?)
    `).run(itemId, product.name, categoryIds[product.category] ?? null, product.base_price, idx, now, now);
  }
}

// GET /api/saas/business-types
router.get('/business-types', async (_req, res, next) => {
  try {
    const presets = await loadPresets();
    const types = Object.entries(presets).map(([key, p]) => ({
      key,
      label: p.label,
    }));
    res.json({ data: types });
  } catch (err) {
    next(err);
  }
});

export { router as saasSignupRoutes };
