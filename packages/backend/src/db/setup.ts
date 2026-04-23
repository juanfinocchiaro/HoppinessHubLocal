import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../../data/hoppiness.db');

const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

console.log('Creating database tables...');

sqlite.exec(`
-- ============================================================================
-- AUTH
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  password_hash TEXT,
  email_confirmed_at TEXT,
  last_sign_in_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users(email);

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  clock_pin TEXT,
  is_active INTEGER DEFAULT 1,
  email_confirmed_at TEXT,
  last_sign_in_at TEXT,
  onboarding_completed INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================================
-- ROLES & PERMISSIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  key TEXT,
  label TEXT,
  description TEXT,
  scope TEXT,
  is_system INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS permissions (
  id TEXT PRIMARY KEY,
  key TEXT,
  label TEXT,
  description TEXT,
  scope TEXT,
  module TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS role_permissions (
  id TEXT PRIMARY KEY,
  role_id TEXT,
  permission_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_role_assignments (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  role_id TEXT,
  branch_id TEXT,
  assigned_by TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================================
-- BRANCHES & CONFIG
-- ============================================================================

CREATE TABLE IF NOT EXISTS branches (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  latitude REAL,
  longitude REAL,
  is_active INTEGER DEFAULT 1,
  is_open INTEGER DEFAULT 0,
  local_open_state INTEGER,
  opening_time TEXT,
  closing_time TEXT,
  public_hours TEXT,
  public_status TEXT,
  clock_code TEXT,
  clock_window_before_min INTEGER DEFAULT 15,
  clock_window_after_min INTEGER DEFAULT 15,
  cover_image_url TEXT,
  google_place_id TEXT,
  enforce_labor_law INTEGER DEFAULT 0,
  expense_pin_threshold REAL,
  admin_force_state TEXT,
  admin_force_message TEXT,
  admin_force_channels TEXT,
  shifts_morning_enabled INTEGER,
  shifts_overnight_enabled INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS branch_shifts (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  name TEXT,
  start_time TEXT,
  end_time TEXT,
  is_active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS branch_printers (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  name TEXT,
  connection_type TEXT DEFAULT 'network',
  ip_address TEXT,
  port INTEGER DEFAULT 9100,
  paper_width INTEGER DEFAULT 80,
  is_active INTEGER DEFAULT 1,
  configured_from_network TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS branch_closure_config (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  config_id TEXT,
  enabled INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS brand_closure_config (
  id TEXT PRIMARY KEY,
  key TEXT,
  label TEXT,
  type TEXT,
  categoria_padre TEXT,
  is_active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS brand_sidebar_order (
  id TEXT PRIMARY KEY,
  section_id TEXT,
  sort_order INTEGER DEFAULT 0,
  updated_by TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================================
-- AFIP & FISCAL
-- ============================================================================

CREATE TABLE IF NOT EXISTS afip_config (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  cuit TEXT,
  business_name TEXT,
  fiscal_address TEXT,
  activity_start_date TEXT,
  point_of_sale INTEGER,
  certificado_crt TEXT,
  csr_pem TEXT,
  private_key_enc TEXT,
  certificate_status TEXT DEFAULT 'pending',
  connection_status TEXT DEFAULT 'disconnected',
  is_production INTEGER DEFAULT 0,
  last_error TEXT,
  last_verification TEXT,
  invoicing_rules TEXT DEFAULT '{}',
  last_invoice_number_a INTEGER,
  last_invoice_number_b INTEGER,
  last_invoice_number_c INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS afip_errores_log (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  error_type TEXT,
  afip_code TEXT,
  message TEXT,
  request_data TEXT,
  response_data TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS fiscal_z_closings (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  closing_date TEXT,
  shift_label TEXT,
  z_number INTEGER,
  total_a REAL DEFAULT 0,
  total_b REAL DEFAULT 0,
  total_c REAL DEFAULT 0,
  invoices_a INTEGER DEFAULT 0,
  invoices_b INTEGER DEFAULT 0,
  invoices_c INTEGER DEFAULT 0,
  credit_notes_a INTEGER DEFAULT 0,
  credit_notes_b INTEGER DEFAULT 0,
  credit_notes_c INTEGER DEFAULT 0,
  from_number_a INTEGER,
  to_number_a INTEGER,
  from_number_b INTEGER,
  to_number_b INTEGER,
  from_number_c INTEGER,
  to_number_c INTEGER,
  total_amount REAL DEFAULT 0,
  total_invoices INTEGER DEFAULT 0,
  notes TEXT,
  generated_by TEXT,
  printed_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS issued_invoices (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  invoice_type TEXT,
  receipt_type TEXT,
  point_of_sale INTEGER,
  invoice_number INTEGER,
  issue_date TEXT,
  customer_name TEXT,
  customer_doc_type TEXT,
  customer_doc_number TEXT,
  total_amount REAL,
  net_amount REAL,
  iva_amount REAL,
  other_taxes REAL,
  cae TEXT,
  cae_expiry TEXT,
  afip_result TEXT,
  afip_response TEXT,
  original_invoice_id TEXT,
  order_id TEXT,
  voided_at TEXT,
  voided_by TEXT,
  voided_reason TEXT,
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id TEXT PRIMARY KEY,
  invoice_id TEXT,
  description TEXT,
  quantity REAL,
  unit_price REAL,
  subtotal REAL,
  iva_rate REAL,
  iva_amount REAL,
  total REAL,
  product_code TEXT,
  unit_code TEXT,
  bonus_percentage REAL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS invoice_payment_links (
  id TEXT PRIMARY KEY,
  invoice_id TEXT,
  payment_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tax_config (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  iibb_rate REAL,
  municipal_rate REAL,
  other_tax_rate REAL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================================
-- AUDIT
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  table_name TEXT,
  action TEXT,
  record_id TEXT,
  old_data TEXT,
  new_data TEXT,
  ip_address TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS financial_audit_log (
  id TEXT PRIMARY KEY,
  entity_type TEXT,
  entity_id TEXT,
  action TEXT,
  old_data TEXT,
  new_data TEXT,
  performed_by TEXT,
  branch_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================================
-- MENU & CATEGORIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS menu_categories (
  id TEXT PRIMARY KEY,
  name TEXT,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  icon TEXT,
  color TEXT,
  parent_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS menu_items (
  id TEXT PRIMARY KEY,
  name TEXT,
  description TEXT,
  category_id TEXT,
  base_price REAL DEFAULT 0,
  image_url TEXT,
  is_active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  kitchen_station_id TEXT,
  preparation_time_min INTEGER,
  tags TEXT DEFAULT '[]',
  allergens TEXT DEFAULT '[]',
  is_combo INTEGER DEFAULT 0,
  combo_items TEXT,
  cost REAL,
  margin_percentage REAL,
  sku TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS menu_item_extras (
  id TEXT PRIMARY KEY,
  menu_item_id TEXT,
  extra_name TEXT,
  extra_price REAL DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  category TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS menu_item_option_groups (
  id TEXT PRIMARY KEY,
  menu_item_id TEXT,
  name TEXT,
  is_required INTEGER DEFAULT 0,
  min_selections INTEGER DEFAULT 0,
  max_selections INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS menu_item_option_group_items (
  id TEXT PRIMARY KEY,
  group_id TEXT,
  name TEXT,
  price_adjustment REAL DEFAULT 0,
  is_default INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS menu_item_compositions (
  id TEXT PRIMARY KEY,
  menu_item_id TEXT,
  recipe_id TEXT,
  quantity REAL DEFAULT 1,
  unit TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS menu_item_price_history (
  id TEXT PRIMARY KEY,
  menu_item_id TEXT,
  old_price REAL,
  new_price REAL,
  changed_by TEXT,
  change_reason TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS item_modifiers (
  id TEXT PRIMARY KEY,
  menu_item_id TEXT,
  name TEXT,
  type TEXT,
  options TEXT DEFAULT '[]',
  is_required INTEGER DEFAULT 0,
  max_selections INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS extra_assignments (
  id TEXT PRIMARY KEY,
  menu_item_id TEXT,
  extra_item_id TEXT,
  is_active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS removable_items (
  id TEXT PRIMARY KEY,
  menu_item_id TEXT,
  ingredient_name TEXT,
  is_active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS kitchen_stations (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  name TEXT,
  color TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS price_lists (
  id TEXT PRIMARY KEY,
  name TEXT,
  description TEXT,
  channel_id TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS price_list_items (
  id TEXT PRIMARY KEY,
  price_list_id TEXT,
  menu_item_id TEXT,
  price REAL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sales_channels (
  id TEXT PRIMARY KEY,
  name TEXT,
  slug TEXT,
  description TEXT,
  is_active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  icon TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS branch_item_availability (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  item_carta_id TEXT,
  available INTEGER DEFAULT 1,
  available_salon INTEGER DEFAULT 1,
  available_webapp INTEGER DEFAULT 1,
  out_of_stock INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================================
-- RECIPES & SUPPLIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS recipe_categories (
  id TEXT PRIMARY KEY,
  name TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS recipes (
  id TEXT PRIMARY KEY,
  name TEXT,
  description TEXT,
  category_id TEXT,
  yield_quantity REAL,
  yield_unit TEXT,
  cost_per_unit REAL,
  total_cost REAL,
  instructions TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id TEXT PRIMARY KEY,
  recipe_id TEXT,
  supply_id TEXT,
  quantity REAL,
  unit TEXT,
  waste_percentage REAL DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS recipe_options (
  id TEXT PRIMARY KEY,
  recipe_id TEXT,
  name TEXT,
  additional_cost REAL DEFAULT 0,
  is_default INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS supply_categories (
  id TEXT PRIMARY KEY,
  name TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS supplies (
  id TEXT PRIMARY KEY,
  name TEXT,
  category_id TEXT,
  unit TEXT,
  cost_per_unit REAL,
  min_stock REAL,
  is_active INTEGER DEFAULT 1,
  sku TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS supply_cost_history (
  id TEXT PRIMARY KEY,
  supply_id TEXT,
  old_cost REAL,
  new_cost REAL,
  changed_by TEXT,
  change_reason TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================================
-- STOCK
-- ============================================================================

CREATE TABLE IF NOT EXISTS stock_actual (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  supply_id TEXT,
  current_quantity REAL DEFAULT 0,
  unit TEXT,
  last_updated_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS stock_cierre_mensual (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  period TEXT,
  supply_id TEXT,
  quantity REAL,
  unit TEXT,
  closed_by TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS stock_conteos (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  conteo_date TEXT,
  status TEXT DEFAULT 'draft',
  notes TEXT,
  created_by TEXT,
  approved_by TEXT,
  approved_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS stock_conteo_items (
  id TEXT PRIMARY KEY,
  conteo_id TEXT,
  supply_id TEXT,
  counted_quantity REAL,
  system_quantity REAL,
  difference REAL,
  unit TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  supply_id TEXT,
  movement_type TEXT,
  quantity REAL,
  unit TEXT,
  reference_id TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================================
-- ORDERS & POS
-- ============================================================================

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  order_number INTEGER,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  customer_address TEXT,
  customer_floor TEXT,
  customer_reference TEXT,
  customer_latitude REAL,
  customer_longitude REAL,
  order_type TEXT,
  area TEXT,
  status TEXT DEFAULT 'pending',
  subtotal REAL DEFAULT 0,
  discount_amount REAL DEFAULT 0,
  discount_code TEXT,
  promotion_id TEXT,
  delivery_cost REAL DEFAULT 0,
  total REAL DEFAULT 0,
  notes TEXT,
  source TEXT,
  payment_method TEXT,
  created_by TEXT,
  assigned_to TEXT,
  estimated_prep_time INTEGER,
  confirmed_at TEXT,
  preparing_at TEXT,
  ready_at TEXT,
  picked_up_at TEXT,
  delivered_at TEXT,
  cancelled_at TEXT,
  cancel_reason TEXT,
  delivery_driver_id TEXT,
  delivery_tracking_code TEXT,
  webapp_tracking_code TEXT,
  is_webapp INTEGER DEFAULT 0,
  pager_number INTEGER,
  table_number TEXT,
  printed_at TEXT,
  customer_user_id TEXT,
  neighborhood_id TEXT,
  fiscal_status TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  menu_item_id TEXT,
  item_name TEXT,
  quantity INTEGER DEFAULT 1,
  unit_price REAL DEFAULT 0,
  subtotal REAL DEFAULT 0,
  notes TEXT,
  kitchen_station_id TEXT,
  status TEXT,
  extras TEXT DEFAULT '[]',
  removals TEXT DEFAULT '[]',
  is_gift INTEGER DEFAULT 0,
  gift_reason TEXT,
  discount_amount REAL DEFAULT 0,
  original_price REAL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS order_item_modifiers (
  id TEXT PRIMARY KEY,
  order_item_id TEXT,
  modifier_name TEXT,
  modifier_type TEXT,
  selected_options TEXT DEFAULT '[]',
  price_adjustment REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS order_payments (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  payment_method TEXT,
  amount REAL,
  reference TEXT,
  status TEXT,
  mp_payment_id TEXT,
  mp_status TEXT,
  mp_status_detail TEXT,
  point_payment_intent_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS order_payment_edits (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  original_payments TEXT,
  new_payments TEXT,
  edited_by TEXT,
  edit_reason TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pagers (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  pager_number INTEGER,
  is_available INTEGER DEFAULT 1,
  assigned_order_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pos_config (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  auto_print_kitchen INTEGER DEFAULT 1,
  auto_print_receipt INTEGER DEFAULT 0,
  default_order_type TEXT DEFAULT 'salon',
  webapp_enabled INTEGER DEFAULT 0,
  webapp_auto_accept INTEGER DEFAULT 0,
  show_item_cost INTEGER DEFAULT 0,
  require_customer_for_delivery INTEGER DEFAULT 1,
  default_area TEXT,
  kitchen_display_mode TEXT,
  pager_enabled INTEGER DEFAULT 0,
  pager_total INTEGER DEFAULT 0,
  table_mode_enabled INTEGER DEFAULT 0,
  table_count INTEGER DEFAULT 0,
  auto_assign_pager INTEGER DEFAULT 0,
  receipt_show_address INTEGER DEFAULT 1,
  receipt_show_phone INTEGER DEFAULT 1,
  receipt_footer_text TEXT,
  receipt_header_text TEXT,
  cash_register_enabled INTEGER DEFAULT 0,
  show_delivery_map INTEGER DEFAULT 0,
  stock_enabled INTEGER DEFAULT 0,
  allow_negative_stock INTEGER DEFAULT 0,
  ticket_copies INTEGER DEFAULT 1,
  auto_print_webapp INTEGER DEFAULT 0,
  receipt_show_order_type INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS operator_session_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  branch_id TEXT,
  action TEXT,
  verified_by TEXT,
  verified_method TEXT,
  metadata TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================================
-- CASH REGISTERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS cash_registers (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  name TEXT,
  is_active INTEGER DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  register_type TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cash_register_shifts (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  cash_register_id TEXT,
  opened_by TEXT,
  opening_amount REAL DEFAULT 0,
  closed_by TEXT,
  closing_amount REAL,
  expected_amount REAL,
  difference REAL,
  status TEXT DEFAULT 'open',
  notes TEXT,
  closing_report TEXT,
  opened_at TEXT DEFAULT (datetime('now')),
  closed_at TEXT,
  printed_at TEXT
);

CREATE TABLE IF NOT EXISTS cash_register_movements (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  shift_id TEXT,
  type TEXT,
  concept TEXT,
  amount REAL,
  payment_method TEXT DEFAULT 'cash',
  expense_category TEXT,
  extra_notes TEXT,
  recorded_by TEXT,
  order_id TEXT,
  source_register_id TEXT,
  rdo_category_code TEXT,
  approval_status TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cashier_discrepancy_history (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  user_id TEXT,
  shift_id TEXT,
  cash_register_id TEXT,
  shift_date TEXT,
  expected_amount REAL,
  actual_amount REAL,
  discrepancy REAL,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS register_shifts_legacy (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  register_name TEXT,
  opened_by TEXT,
  opening_amount REAL,
  closed_by TEXT,
  closing_amount REAL,
  expected_amount REAL,
  difference REAL,
  status TEXT,
  notes TEXT,
  opened_at TEXT,
  closed_at TEXT
);

-- ============================================================================
-- PRINTING
-- ============================================================================

CREATE TABLE IF NOT EXISTS print_config (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  trigger_type TEXT,
  target_printer_id TEXT,
  is_active INTEGER DEFAULT 1,
  copies INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS print_jobs (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  printer_id TEXT,
  job_type TEXT,
  status TEXT DEFAULT 'pending',
  content TEXT,
  order_id TEXT,
  error_message TEXT,
  retries INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  printed_at TEXT
);

-- ============================================================================
-- DELIVERY
-- ============================================================================

CREATE TABLE IF NOT EXISTS delivery_drivers (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  name TEXT,
  phone TEXT,
  user_id TEXT,
  is_active INTEGER DEFAULT 1,
  is_available INTEGER DEFAULT 1,
  orders_today INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS delivery_pricing_config (
  id TEXT PRIMARY KEY,
  brand_id TEXT,
  base_price REAL DEFAULT 0,
  base_distance_km REAL DEFAULT 3,
  price_per_extra_km REAL DEFAULT 0,
  max_allowed_radius_km REAL DEFAULT 10,
  prep_time_minutes INTEGER DEFAULT 30,
  estimated_speed_kmh REAL DEFAULT 30,
  google_api_key_encrypted TEXT,
  time_disclaimer TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS delivery_radius_overrides_log (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  action TEXT,
  previous_km REAL,
  new_km REAL,
  performed_by TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS delivery_zones (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  name TEXT,
  description TEXT,
  delivery_cost REAL DEFAULT 0,
  pedido_minimo REAL,
  estimated_time_min INTEGER,
  barrios TEXT DEFAULT '[]',
  is_active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS delivery_tracking (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  driver_id TEXT,
  latitude REAL,
  longitude REAL,
  status TEXT,
  estimated_arrival TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS branch_delivery_config (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  delivery_enabled INTEGER DEFAULT 0,
  default_radius_km REAL DEFAULT 5,
  radius_override_km REAL,
  radius_override_by TEXT,
  radius_override_until TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS branch_delivery_neighborhoods (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  neighborhood_id TEXT,
  status TEXT DEFAULT 'allowed',
  distance_km REAL,
  decided_by TEXT,
  block_reason TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS city_neighborhoods (
  id TEXT PRIMARY KEY,
  name TEXT,
  city TEXT DEFAULT 'Córdoba',
  centroid_lat REAL,
  centroid_lng REAL,
  source TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================================
-- PROMOTIONS & DISCOUNTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS promotions (
  id TEXT PRIMARY KEY,
  name TEXT,
  description TEXT,
  discount_type TEXT,
  discount_value REAL DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  start_date TEXT,
  end_date TEXT,
  branch_ids TEXT DEFAULT '[]',
  min_order_amount REAL,
  max_discount REAL,
  applies_to TEXT,
  target_item_ids TEXT DEFAULT '[]',
  buy_quantity INTEGER,
  get_quantity INTEGER,
  image_url TEXT,
  channels TEXT DEFAULT '[]',
  created_by TEXT,
  deleted_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS promotion_items (
  id TEXT PRIMARY KEY,
  promotion_id TEXT,
  menu_item_id TEXT,
  quantity INTEGER DEFAULT 1,
  is_gift INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS promotion_item_extras (
  id TEXT PRIMARY KEY,
  promotion_item_id TEXT,
  extra_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS discount_codes (
  id TEXT PRIMARY KEY,
  code TEXT,
  type TEXT,
  value REAL DEFAULT 0,
  brand_id TEXT,
  branch_ids TEXT DEFAULT '[]',
  start_date TEXT,
  end_date TEXT,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  min_order_amount REAL,
  single_use_per_user INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_by TEXT,
  deleted_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS discount_code_uses (
  id TEXT PRIMARY KEY,
  code_id TEXT,
  user_id TEXT,
  pedido_id TEXT,
  discount_amount REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================================
-- EMPLOYEES & HR
-- ============================================================================

CREATE TABLE IF NOT EXISTS employee_data (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  branch_id TEXT,
  alias TEXT,
  dni TEXT,
  cuil TEXT,
  birth_date TEXT,
  personal_address TEXT,
  emergency_contact TEXT,
  emergency_phone TEXT,
  hire_date TEXT,
  hourly_rate REAL,
  monthly_hours_target REAL,
  registered_hours REAL,
  bank_name TEXT,
  cbu TEXT,
  internal_notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS employee_schedules (
  id TEXT PRIMARY KEY,
  employee_id TEXT,
  user_id TEXT,
  branch_id TEXT,
  schedule_date TEXT,
  schedule_month INTEGER,
  schedule_year INTEGER,
  day_of_week INTEGER,
  shift_number INTEGER DEFAULT 1,
  start_time TEXT,
  end_time TEXT,
  start_time_2 TEXT,
  end_time_2 TEXT,
  break_start TEXT,
  break_end TEXT,
  is_day_off INTEGER DEFAULT 0,
  work_position TEXT,
  published_at TEXT,
  published_by TEXT,
  notification_sent_at TEXT,
  modification_reason TEXT,
  modified_at TEXT,
  modified_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS employee_time_state (
  employee_id TEXT PRIMARY KEY,
  branch_id TEXT,
  current_state TEXT DEFAULT 'idle',
  last_event_id TEXT,
  open_clock_in_id TEXT,
  open_schedule_id TEXT,
  last_updated TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS employee_certifications (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  branch_id TEXT,
  station_id TEXT,
  level INTEGER DEFAULT 1,
  notes TEXT,
  certified_by TEXT,
  certified_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS employee_consumptions (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  branch_id TEXT,
  amount REAL DEFAULT 0,
  description TEXT,
  consumption_date TEXT,
  source TEXT DEFAULT 'manual',
  created_by TEXT,
  deleted_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS manual_consumptions (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  branch_id TEXT,
  amount REAL DEFAULT 0,
  description TEXT,
  consumption_date TEXT,
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS salary_advances (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  branch_id TEXT,
  amount REAL,
  advance_date TEXT,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  approved_by TEXT,
  approved_at TEXT,
  rejected_reason TEXT,
  payment_method TEXT,
  reference TEXT,
  notes TEXT,
  created_by TEXT,
  deleted_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS staff_invitations (
  id TEXT PRIMARY KEY,
  email TEXT,
  phone TEXT,
  full_name TEXT,
  branch_id TEXT,
  role_key TEXT,
  invited_by TEXT,
  token TEXT,
  status TEXT DEFAULT 'pending',
  expires_at TEXT,
  accepted_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS warnings (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  branch_id TEXT,
  warning_type TEXT,
  severity TEXT,
  description TEXT,
  issued_by TEXT,
  issued_date TEXT,
  acknowledgement_date TEXT,
  acknowledgement_signature_url TEXT,
  status TEXT DEFAULT 'active',
  notes TEXT,
  expiry_date TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS schedule_requests (
  id TEXT PRIMARY KEY,
  employee_id TEXT,
  branch_id TEXT,
  request_type TEXT,
  start_date TEXT,
  end_date TEXT,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  reviewed_by TEXT,
  reviewed_at TEXT,
  review_notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================================
-- CLOCK & LABOR
-- ============================================================================

CREATE TABLE IF NOT EXISTS clock_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  branch_id TEXT,
  entry_type TEXT,
  is_manual INTEGER DEFAULT 0,
  manual_by TEXT,
  manual_reason TEXT,
  latitude REAL,
  longitude REAL,
  gps_status TEXT,
  gps_message TEXT,
  photo_url TEXT,
  user_agent TEXT,
  ip_address TEXT,
  schedule_id TEXT,
  work_date TEXT,
  anomaly_type TEXT,
  resolved_type TEXT,
  early_leave_authorized INTEGER DEFAULT 0,
  original_created_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS labor_config (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  overtime_threshold_daily REAL,
  overtime_threshold_weekly REAL,
  overtime_multiplier REAL DEFAULT 1.5,
  night_start TEXT,
  night_end TEXT,
  night_multiplier REAL DEFAULT 1.5,
  holiday_multiplier REAL DEFAULT 2,
  round_to_minutes INTEGER DEFAULT 15,
  auto_deduct_break INTEGER DEFAULT 0,
  break_deduct_minutes INTEGER DEFAULT 0,
  tolerance_minutes INTEGER DEFAULT 5,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS special_days (
  id TEXT PRIMARY KEY,
  date TEXT,
  name TEXT,
  type TEXT,
  is_recurring INTEGER DEFAULT 0,
  applies_to_branches TEXT DEFAULT '[]',
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================================
-- SHIFT CLOSURES & PERIODS
-- ============================================================================

CREATE TABLE IF NOT EXISTS shift_closures (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  shift_id TEXT,
  closure_date TEXT,
  data TEXT DEFAULT '{}',
  notes TEXT,
  closed_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS periods (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  period TEXT,
  start_date TEXT,
  end_date TEXT,
  status TEXT DEFAULT 'open',
  closed_at TEXT,
  closed_by TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================================
-- COACHING & COMPETENCIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS coachings (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  branch_id TEXT,
  evaluated_by TEXT,
  coaching_date TEXT,
  coaching_month INTEGER,
  coaching_year INTEGER,
  coaching_type TEXT,
  general_score REAL,
  station_score REAL,
  overall_score REAL,
  strengths TEXT,
  areas_to_improve TEXT,
  action_plan TEXT,
  previous_action_review TEXT,
  manager_notes TEXT,
  acknowledged_at TEXT,
  acknowledged_notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS coaching_competency_scores (
  id TEXT PRIMARY KEY,
  coaching_id TEXT,
  competency_id TEXT,
  competency_type TEXT,
  score INTEGER DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS coaching_station_scores (
  id TEXT PRIMARY KEY,
  coaching_id TEXT,
  station_id TEXT,
  score INTEGER DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS general_competencies (
  id TEXT PRIMARY KEY,
  name TEXT,
  description TEXT,
  is_active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS manager_competencies (
  id TEXT PRIMARY KEY,
  name TEXT,
  description TEXT,
  is_active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS station_competencies (
  id TEXT PRIMARY KEY,
  station_id TEXT,
  competency_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS work_stations (
  id TEXT PRIMARY KEY,
  name TEXT,
  description TEXT,
  is_active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS work_positions (
  id TEXT PRIMARY KEY,
  name TEXT,
  type TEXT,
  branch_id TEXT,
  is_active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================================
-- INSPECTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS inspection_templates (
  id TEXT PRIMARY KEY,
  name TEXT,
  description TEXT,
  sections TEXT DEFAULT '[]',
  is_active INTEGER DEFAULT 1,
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS inspection_items (
  id TEXT PRIMARY KEY,
  inspection_id TEXT,
  template_item_id TEXT,
  section TEXT,
  item_label TEXT,
  score INTEGER,
  max_score INTEGER,
  is_critical INTEGER DEFAULT 0,
  notes TEXT,
  photo_url TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS inspection_staff_present (
  id TEXT PRIMARY KEY,
  inspection_id TEXT,
  user_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================================
-- MEETINGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS meetings (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  title TEXT,
  description TEXT,
  meeting_date TEXT,
  start_time TEXT,
  end_time TEXT,
  status TEXT DEFAULT 'scheduled',
  location TEXT,
  meeting_type TEXT,
  created_by TEXT,
  minutes TEXT,
  closed_at TEXT,
  closed_by TEXT,
  notification_sent_at TEXT,
  minutes_notification_sent_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS meeting_participants (
  id TEXT PRIMARY KEY,
  meeting_id TEXT,
  user_id TEXT,
  attendance TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS meeting_agreements (
  id TEXT PRIMARY KEY,
  meeting_id TEXT,
  description TEXT,
  responsible_id TEXT,
  due_date TEXT,
  status TEXT DEFAULT 'pending',
  completed_at TEXT,
  completed_by TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS meeting_agreement_assignees (
  id TEXT PRIMARY KEY,
  agreement_id TEXT,
  user_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================================
-- COMMUNICATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS communications (
  id TEXT PRIMARY KEY,
  title TEXT,
  body TEXT,
  type TEXT,
  tag TEXT,
  custom_label TEXT,
  source_type TEXT,
  source_branch_id TEXT,
  created_by TEXT,
  target_branch_ids TEXT DEFAULT '[]',
  target_roles TEXT DEFAULT '[]',
  is_published INTEGER DEFAULT 0,
  published_at TEXT,
  requires_confirmation INTEGER DEFAULT 0,
  expires_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS communication_reads (
  id TEXT PRIMARY KEY,
  communication_id TEXT,
  user_id TEXT,
  read_at TEXT,
  confirmed_at TEXT
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  endpoint TEXT,
  keys TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id TEXT PRIMARY KEY,
  template_key TEXT,
  template_text TEXT,
  updated_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================================
-- REGULATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS regulations (
  id TEXT PRIMARY KEY,
  title TEXT,
  content TEXT,
  file_url TEXT,
  version TEXT,
  is_active INTEGER DEFAULT 1,
  requires_signature INTEGER DEFAULT 0,
  scope TEXT,
  target_branch_ids TEXT DEFAULT '[]',
  created_by TEXT,
  published_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS regulation_signatures (
  id TEXT PRIMARY KEY,
  regulation_id TEXT,
  user_id TEXT,
  signature_url TEXT,
  signed_at TEXT,
  ip_address TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================================
-- CONTACT
-- ============================================================================

CREATE TABLE IF NOT EXISTS contact_messages (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT,
  phone TEXT,
  subject TEXT,
  message TEXT,
  status TEXT DEFAULT 'new',
  priority TEXT,
  read_at TEXT,
  replied_at TEXT,
  replied_by TEXT,
  assigned_to TEXT,
  notes TEXT,
  attachment_url TEXT,
  attachment_name TEXT,
  franchise_has_location TEXT,
  franchise_has_zone TEXT,
  franchise_investment_capital TEXT,
  investment_range TEXT,
  employment_position TEXT,
  employment_branch_id TEXT,
  employment_cv_link TEXT,
  employment_motivation TEXT,
  order_number TEXT,
  order_date TEXT,
  order_branch_id TEXT,
  order_issue TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================================
-- CUSTOMER & WEBAPP
-- ============================================================================

CREATE TABLE IF NOT EXISTS customer_addresses (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  label TEXT DEFAULT 'Casa',
  address TEXT,
  city TEXT,
  floor TEXT,
  reference TEXT,
  latitude REAL,
  longitude REAL,
  is_primary INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS webapp_config (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  is_active INTEGER DEFAULT 0,
  slug TEXT,
  hero_image_url TEXT,
  welcome_message TEXT,
  min_order_amount REAL,
  delivery_enabled INTEGER DEFAULT 0,
  takeaway_enabled INTEGER DEFAULT 1,
  salon_enabled INTEGER DEFAULT 0,
  estimated_delivery_time INTEGER,
  estimated_takeaway_time INTEGER,
  payment_methods TEXT DEFAULT '[]',
  custom_css TEXT,
  maintenance_message TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS webapp_order_messages (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  tracking_code TEXT,
  sender_type TEXT,
  sender_name TEXT,
  message TEXT,
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================================
-- PAYMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS mercadopago_config (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  access_token_encrypted TEXT,
  public_key TEXT,
  collector_id TEXT,
  external_pos_id TEXT,
  terminal_serial TEXT,
  operating_mode TEXT,
  is_active INTEGER DEFAULT 0,
  last_tested_at TEXT,
  test_result TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================================
-- CANON & FINANCIAL
-- ============================================================================

CREATE TABLE IF NOT EXISTS canon_settlements (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  period TEXT,
  cash_total REAL DEFAULT 0,
  online_total REAL DEFAULT 0,
  canon_percentage REAL,
  canon_amount REAL DEFAULT 0,
  marketing_percentage REAL,
  marketing_amount REAL DEFAULT 0,
  total_canon REAL DEFAULT 0,
  cash_percentage REAL,
  suggested_cash_payment REAL,
  suggested_transfer_payment REAL,
  pending_balance REAL,
  status TEXT DEFAULT 'draft',
  due_date TEXT,
  notes TEXT,
  monthly_sales_id TEXT,
  created_by TEXT,
  deleted_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS canon_payments (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  canon_settlement_id TEXT,
  payment_date TEXT,
  amount REAL,
  payment_method TEXT,
  reference TEXT,
  notes TEXT,
  payment_data TEXT,
  is_verified INTEGER DEFAULT 0,
  verified_by TEXT,
  verified_at TEXT,
  verified_notes TEXT,
  created_by TEXT,
  deleted_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  concept TEXT,
  amount REAL,
  payment_method TEXT,
  expense_category TEXT,
  affects_register INTEGER DEFAULT 0,
  notes TEXT,
  attachments TEXT,
  rdo_category_code TEXT,
  expense_date TEXT,
  created_by TEXT,
  approved_by TEXT,
  approval_status TEXT,
  deleted_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS investments (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  concept TEXT,
  amount REAL,
  investment_date TEXT,
  notes TEXT,
  created_by TEXT,
  deleted_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS partners (
  id TEXT PRIMARY KEY,
  name TEXT,
  document_number TEXT,
  ownership_percentage REAL,
  investment_amount REAL,
  join_date TEXT,
  phone TEXT,
  email TEXT,
  is_active INTEGER DEFAULT 1,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS partner_movements (
  id TEXT PRIMARY KEY,
  partner_id TEXT,
  type TEXT,
  amount REAL,
  description TEXT,
  reference_date TEXT,
  created_by TEXT,
  deleted_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS profit_distributions (
  id TEXT PRIMARY KEY,
  period TEXT,
  total_profit REAL,
  distribution_date TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS branch_monthly_sales (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  period TEXT,
  source TEXT DEFAULT 'manual',
  total_sales REAL,
  cash_total REAL DEFAULT 0,
  online_total REAL DEFAULT 0,
  cash REAL,
  cash_percentage REAL,
  notes TEXT,
  loaded_by TEXT,
  loaded_at TEXT,
  deleted_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================================
-- RDO
-- ============================================================================

CREATE TABLE IF NOT EXISTS rdo_categories (
  id TEXT PRIMARY KEY,
  code TEXT,
  label TEXT,
  type TEXT,
  parent_code TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS rdo_movements (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  period TEXT,
  category_code TEXT,
  amount REAL DEFAULT 0,
  notes TEXT,
  source TEXT,
  created_by TEXT,
  deleted_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS service_concepts (
  id TEXT PRIMARY KEY,
  code TEXT,
  label TEXT,
  type TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================================
-- SUPPLIERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  name TEXT,
  cuit TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  category TEXT,
  payment_terms TEXT,
  notes TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS supplier_branch_terms (
  id TEXT PRIMARY KEY,
  supplier_id TEXT,
  branch_id TEXT,
  delivery_days TEXT DEFAULT '[]',
  payment_terms TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS supplier_invoices (
  id TEXT PRIMARY KEY,
  supplier_id TEXT,
  branch_id TEXT,
  invoice_number TEXT,
  invoice_date TEXT,
  due_date TEXT,
  subtotal REAL,
  tax_amount REAL,
  total_amount REAL,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  period TEXT,
  created_by TEXT,
  deleted_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS supplier_payments (
  id TEXT PRIMARY KEY,
  supplier_id TEXT,
  branch_id TEXT,
  amount REAL,
  payment_date TEXT,
  payment_method TEXT,
  reference TEXT,
  notes TEXT,
  invoice_id TEXT,
  created_by TEXT,
  deleted_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
`);

console.log('All 129+ tables created successfully!');

sqlite.close();
