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

console.log('Creating database tables from PG schema...');

sqlite.exec(`
-- Users table (local auth, not in PG dump)
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

CREATE TABLE IF NOT EXISTS afip_config (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  cuit TEXT,
  business_name TEXT,
  fiscal_address TEXT,
  activity_start_date TEXT,
  point_of_sale INTEGER,
  certificado_crt TEXT,
  private_key_enc TEXT,
  connection_status TEXT,
  last_error TEXT,
  last_verification TEXT,
  last_invoice_number_a TEXT,
  last_invoice_number_b TEXT,
  last_invoice_number_c TEXT,
  is_production INTEGER,
  created_at TEXT,
  updated_at TEXT,
  certificate_status TEXT,
  csr_pem TEXT,
  invoicing_rules TEXT
);

CREATE TABLE IF NOT EXISTS afip_errores_log (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  error_type TEXT,
  afip_code TEXT,
  message TEXT,
  request_data TEXT,
  response_data TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT,
  table_name TEXT,
  record_id TEXT,
  old_data TEXT,
  new_data TEXT,
  ip_address TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS branch_closure_config (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  config_id TEXT,
  enabled INTEGER
);

CREATE TABLE IF NOT EXISTS branch_delivery_config (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  default_radius_km REAL,
  radius_override_km REAL,
  radius_override_until TEXT,
  radius_override_by TEXT,
  delivery_enabled INTEGER,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS branch_delivery_neighborhoods (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  neighborhood_id TEXT,
  status TEXT,
  distance_km REAL,
  decided_by TEXT,
  block_reason TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS branch_inspections (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  inspection_type TEXT,
  inspector_id TEXT,
  started_at TEXT,
  completed_at TEXT,
  status TEXT,
  score_total REAL,
  present_manager_id TEXT,
  general_notes TEXT,
  critical_findings TEXT,
  action_items TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS branch_item_availability (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  item_carta_id TEXT,
  available INTEGER,
  available_webapp INTEGER,
  available_salon INTEGER,
  out_of_stock INTEGER,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS branch_monthly_sales (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  period TEXT,
  online_total TEXT,
  cash_total TEXT,
  cash_percentage REAL,
  loaded_at TEXT,
  loaded_by TEXT,
  notes TEXT,
  created_at TEXT,
  updated_at TEXT,
  deleted_at TEXT,
  total_sales REAL,
  cash TEXT,
  source TEXT
);

CREATE TABLE IF NOT EXISTS branch_printers (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  name TEXT,
  connection_type TEXT,
  ip_address TEXT,
  port INTEGER,
  paper_width INTEGER,
  is_active INTEGER,
  created_at TEXT,
  configured_from_network TEXT
);

CREATE TABLE IF NOT EXISTS branch_shifts (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  name TEXT,
  start_time TEXT,
  end_time TEXT,
  sort_order INTEGER,
  is_active INTEGER,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS branches (
  id TEXT PRIMARY KEY,
  name TEXT,
  address TEXT,
  city TEXT,
  phone TEXT,
  email TEXT,
  is_active INTEGER,
  opening_time TEXT,
  closing_time TEXT,
  created_at TEXT,
  updated_at TEXT,
  slug TEXT,
  is_open INTEGER,
  enforce_labor_law INTEGER,
  local_open_state TEXT,
  admin_force_state TEXT,
  admin_force_channels TEXT,
  admin_force_message TEXT,
  latitude REAL,
  longitude REAL,
  expense_pin_threshold TEXT,
  clock_code TEXT,
  shifts_morning_enabled TEXT,
  shifts_overnight_enabled TEXT,
  public_status TEXT,
  public_hours TEXT,
  cover_image_url TEXT,
  google_place_id TEXT,
  clock_window_before_min INTEGER,
  clock_window_after_min INTEGER
);

CREATE TABLE IF NOT EXISTS brand_closure_config (
  id TEXT PRIMARY KEY,
  type TEXT,
  key TEXT,
  label TEXT,
  categoria_padre TEXT,
  sort_order INTEGER,
  is_active INTEGER,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS brand_sidebar_order (
  id TEXT PRIMARY KEY,
  section_id TEXT,
  sort_order INTEGER,
  updated_at TEXT,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS canon_payments (
  id TEXT PRIMARY KEY,
  canon_settlement_id TEXT,
  branch_id TEXT,
  payment_date TEXT,
  amount REAL,
  payment_method TEXT,
  reference TEXT,
  payment_data REAL,
  notes TEXT,
  created_at TEXT,
  created_by TEXT,
  deleted_at TEXT,
  is_verified INTEGER,
  verified_by TEXT,
  verified_at TEXT,
  verified_notes TEXT
);

CREATE TABLE IF NOT EXISTS canon_settlements (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  period TEXT,
  monthly_sales_id TEXT,
  online_total TEXT,
  cash_total TEXT,
  cash_percentage REAL,
  canon_percentage REAL,
  canon_amount REAL,
  marketing_percentage REAL,
  marketing_amount REAL,
  total_canon TEXT,
  suggested_transfer_payment TEXT,
  suggested_cash_payment TEXT,
  status TEXT,
  pending_balance REAL,
  due_date TEXT,
  notes TEXT,
  created_at TEXT,
  created_by TEXT,
  updated_at TEXT,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS cash_register_movements (
  id TEXT PRIMARY KEY,
  shift_id TEXT,
  branch_id TEXT,
  type TEXT,
  payment_method TEXT,
  amount REAL,
  concept TEXT,
  order_id TEXT,
  recorded_by TEXT,
  created_at TEXT,
  source_register_id TEXT,
  expense_category TEXT,
  rdo_category_code TEXT,
  approval_status TEXT,
  extra_notes TEXT
);

CREATE TABLE IF NOT EXISTS cash_register_shifts (
  id TEXT PRIMARY KEY,
  cash_register_id TEXT,
  branch_id TEXT,
  opened_by TEXT,
  closed_by TEXT,
  opened_at TEXT,
  closed_at TEXT,
  opening_amount REAL,
  closing_amount REAL,
  expected_amount REAL,
  difference REAL,
  notes TEXT,
  status TEXT,
  closing_report TEXT,
  printed_at TEXT
);

CREATE TABLE IF NOT EXISTS cash_registers (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  name TEXT,
  display_order INTEGER,
  is_active INTEGER,
  created_at TEXT,
  register_type TEXT
);

CREATE TABLE IF NOT EXISTS cashier_discrepancy_history (
  id TEXT PRIMARY KEY,
  shift_id TEXT,
  branch_id TEXT,
  user_id TEXT,
  cash_register_id TEXT,
  expected_amount REAL,
  actual_amount REAL,
  discrepancy REAL,
  shift_date TEXT,
  notes TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS city_neighborhoods (
  id TEXT PRIMARY KEY,
  name TEXT,
  city TEXT,
  centroid_lat REAL,
  centroid_lng REAL,
  source TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS clock_entries (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  user_id TEXT,
  entry_type TEXT,
  photo_url TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT,
  gps_status TEXT,
  gps_message TEXT,
  latitude REAL,
  longitude REAL,
  is_manual INTEGER,
  manual_by TEXT,
  manual_reason TEXT,
  original_created_at TEXT,
  schedule_id TEXT,
  resolved_type TEXT,
  anomaly_type TEXT,
  work_date TEXT,
  early_leave_authorized INTEGER
);

CREATE TABLE IF NOT EXISTS coaching_competency_scores (
  id TEXT PRIMARY KEY,
  coaching_id TEXT,
  competency_type TEXT,
  competency_id TEXT,
  score REAL,
  notes TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS coaching_station_scores (
  id TEXT PRIMARY KEY,
  coaching_id TEXT,
  station_id TEXT,
  score REAL,
  notes TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS coachings (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  branch_id TEXT,
  evaluated_by TEXT,
  coaching_date TEXT,
  coaching_month INTEGER,
  coaching_year INTEGER,
  general_score REAL,
  station_score REAL,
  overall_score REAL,
  strengths TEXT,
  areas_to_improve TEXT,
  action_plan TEXT,
  manager_notes TEXT,
  acknowledged_at TEXT,
  acknowledged_notes TEXT,
  created_at TEXT,
  updated_at TEXT,
  previous_action_review TEXT,
  coaching_type TEXT
);

CREATE TABLE IF NOT EXISTS communication_reads (
  id TEXT PRIMARY KEY,
  communication_id TEXT,
  user_id TEXT,
  read_at TEXT,
  confirmed_at TEXT
);

CREATE TABLE IF NOT EXISTS communications (
  id TEXT PRIMARY KEY,
  title TEXT,
  body TEXT,
  type TEXT,
  target_branch_ids TEXT,
  target_roles TEXT,
  is_published INTEGER,
  published_at TEXT,
  expires_at TEXT,
  created_by TEXT,
  created_at TEXT,
  updated_at TEXT,
  custom_label TEXT,
  tag TEXT,
  source_type TEXT,
  source_branch_id TEXT,
  requires_confirmation INTEGER
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT,
  phone TEXT,
  subject TEXT,
  message TEXT,
  franchise_has_zone TEXT,
  franchise_has_location TEXT,
  franchise_investment_capital TEXT,
  employment_branch_id TEXT,
  employment_position TEXT,
  employment_cv_link TEXT,
  employment_motivation TEXT,
  order_branch_id TEXT,
  order_number INTEGER,
  order_date TEXT,
  order_issue TEXT,
  status TEXT,
  priority TEXT,
  assigned_to TEXT,
  notes TEXT,
  created_at TEXT,
  updated_at TEXT,
  read_at TEXT,
  replied_at TEXT,
  replied_by TEXT,
  attachment_url TEXT,
  attachment_name TEXT,
  investment_range TEXT
);

CREATE TABLE IF NOT EXISTS customer_addresses (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  label TEXT,
  address TEXT,
  floor TEXT,
  reference TEXT,
  city TEXT,
  latitude REAL,
  longitude REAL,
  is_primary INTEGER,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS delivery_drivers (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  user_id TEXT,
  name TEXT,
  phone TEXT,
  is_active INTEGER,
  is_available INTEGER,
  orders_today INTEGER,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS delivery_pricing_config (
  id TEXT PRIMARY KEY,
  brand_id TEXT,
  base_distance_km REAL,
  base_price REAL,
  price_per_extra_km REAL,
  max_allowed_radius_km REAL,
  estimated_speed_kmh TEXT,
  prep_time_minutes INTEGER,
  time_disclaimer TEXT,
  google_api_key_encrypted TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS delivery_radius_overrides_log (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  previous_km REAL,
  new_km REAL,
  action TEXT,
  performed_by TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS delivery_zones (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  name TEXT,
  delivery_cost REAL,
  pedido_minimo TEXT,
  estimated_time_min INTEGER,
  barrios TEXT,
  description TEXT,
  sort_order INTEGER,
  is_active INTEGER,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS discount_code_uses (
  id TEXT PRIMARY KEY,
  code_id TEXT,
  user_id TEXT,
  pedido_id TEXT,
  discount_amount REAL,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS discount_codes (
  id TEXT PRIMARY KEY,
  brand_id TEXT,
  code TEXT,
  type TEXT,
  value TEXT,
  max_uses INTEGER,
  current_uses INTEGER,
  single_use_per_user INTEGER,
  min_order_amount REAL,
  start_date TEXT,
  end_date TEXT,
  is_active INTEGER,
  branch_ids TEXT,
  created_by TEXT,
  created_at TEXT,
  updated_at TEXT,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS employee_certifications (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  branch_id TEXT,
  station_id TEXT,
  level INTEGER,
  certified_at TEXT,
  certified_by TEXT,
  notes TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS employee_consumptions (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  user_id TEXT,
  amount REAL,
  consumption_date TEXT,
  description TEXT,
  source TEXT,
  created_by TEXT,
  created_at TEXT,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS employee_data (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  branch_id TEXT,
  dni TEXT,
  birth_date TEXT,
  personal_address TEXT,
  emergency_contact TEXT,
  emergency_phone TEXT,
  bank_name TEXT,
  cbu TEXT,
  alias TEXT,
  cuil TEXT,
  hire_date TEXT,
  monthly_hours_target REAL,
  hourly_rate REAL,
  internal_notes TEXT,
  created_at TEXT,
  updated_at TEXT,
  registered_hours REAL
);

CREATE TABLE IF NOT EXISTS employee_schedules (
  id TEXT PRIMARY KEY,
  employee_id TEXT,
  day_of_week INTEGER,
  start_time TEXT,
  end_time TEXT,
  is_day_off INTEGER,
  created_at TEXT,
  updated_at TEXT,
  shift_number INTEGER,
  schedule_month INTEGER,
  schedule_year INTEGER,
  user_id TEXT,
  branch_id TEXT,
  schedule_date TEXT,
  published_at TEXT,
  published_by TEXT,
  modified_at TEXT,
  modified_by TEXT,
  modification_reason TEXT,
  notification_sent_at TEXT,
  work_position TEXT,
  start_time_2 TEXT,
  end_time_2 TEXT,
  break_start TEXT,
  break_end TEXT
);

CREATE TABLE IF NOT EXISTS employee_time_state (
  employee_id TEXT,
  branch_id TEXT,
  current_state TEXT,
  last_event_id TEXT,
  open_clock_in_id TEXT,
  open_schedule_id TEXT,
  last_updated TEXT
);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  period TEXT,
  main_category TEXT,
  subcategory TEXT,
  concept TEXT,
  amount REAL,
  date TEXT,
  details TEXT,
  payment_method TEXT,
  payment_reference TEXT,
  attachments TEXT,
  notes TEXT,
  status TEXT,
  created_at TEXT,
  created_by TEXT,
  updated_at TEXT,
  deleted_at TEXT,
  due_date TEXT,
  payment_date TEXT,
  related_expense_id TEXT,
  rdo_category_code TEXT,
  proveedor_id TEXT,
  payment_type TEXT,
  affects_register INTEGER,
  transfer_cost REAL,
  shift_id TEXT,
  rdo_section TEXT
);

CREATE TABLE IF NOT EXISTS extra_assignments (
  id TEXT PRIMARY KEY,
  item_carta_id TEXT,
  extra_id TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS financial_audit_log (
  id TEXT PRIMARY KEY,
  tabla TEXT,
  registro_id TEXT,
  operacion TEXT,
  datos_antes TEXT,
  datos_despues TEXT,
  campos_modificados TEXT,
  user_id TEXT,
  user_email TEXT,
  ip_address TEXT,
  user_agent TEXT,
  timestamp TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS fiscal_z_closings (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  pos_point_of_sale TEXT,
  z_number INTEGER,
  date TEXT,
  period_from TEXT,
  period_to TEXT,
  total_invoices REAL,
  total_invoices_b REAL,
  total_invoices_c REAL,
  total_tickets REAL,
  total_credit_notes_b REAL,
  total_credit_notes_c REAL,
  first_voucher_type TEXT,
  first_voucher_number TEXT,
  last_voucher_type TEXT,
  last_voucher_number TEXT,
  taxable_21 REAL,
  vat_21 REAL,
  taxable_105 REAL,
  vat_105 REAL,
  exempt REAL,
  non_taxable REAL,
  other_taxes REAL,
  subtotal_net REAL,
  total_vat REAL,
  total_sales REAL,
  total_credit_notes_amount REAL,
  net_total REAL,
  payment_cash REAL,
  payment_debit REAL,
  payment_credit REAL,
  payment_qr REAL,
  payment_transfer REAL,
  generated_by TEXT,
  generated_at TEXT,
  is_locked INTEGER,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS general_competencies (
  id TEXT PRIMARY KEY,
  key TEXT,
  name TEXT,
  description TEXT,
  weight REAL,
  sort_order INTEGER,
  is_active INTEGER,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS inspection_items (
  id TEXT PRIMARY KEY,
  inspection_id TEXT,
  category TEXT,
  item_key TEXT,
  item_label TEXT,
  complies INTEGER,
  observations TEXT,
  sort_order INTEGER,
  created_at TEXT,
  photo_urls TEXT
);

CREATE TABLE IF NOT EXISTS inspection_staff_present (
  id TEXT PRIMARY KEY,
  inspection_id TEXT,
  user_id TEXT,
  observations TEXT,
  created_at TEXT,
  uniform_ok INTEGER,
  station_clean INTEGER
);

CREATE TABLE IF NOT EXISTS inspection_templates (
  id TEXT PRIMARY KEY,
  inspection_type TEXT,
  category TEXT,
  item_key TEXT,
  item_label TEXT,
  sort_order INTEGER,
  is_active INTEGER,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS investments (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  description TEXT,
  investment_type TEXT,
  total_amount REAL,
  date TEXT,
  period TEXT,
  vida_util_meses INTEGER,
  status TEXT,
  total_installments INTEGER,
  installments_paid INTEGER,
  notes TEXT,
  created_by TEXT,
  created_at TEXT,
  updated_at TEXT,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id TEXT PRIMARY KEY,
  invoice_id TEXT,
  insumo_id TEXT,
  quantity REAL,
  unit TEXT,
  unit_price REAL,
  subtotal REAL,
  affects_base_cost INTEGER,
  pl_category TEXT,
  notes TEXT,
  created_at TEXT,
  item_type TEXT,
  service_concept_id TEXT,
  rdo_category_code TEXT,
  alicuota_iva TEXT,
  vat_amount REAL,
  gross_unit_price REAL,
  gross_price REAL,
  descuento_porcentaje TEXT,
  discount_amount REAL,
  net_price REAL
);

CREATE TABLE IF NOT EXISTS invoice_payment_links (
  id TEXT PRIMARY KEY,
  pago_id TEXT,
  invoice_id TEXT,
  applied_amount REAL
);

CREATE TABLE IF NOT EXISTS issued_invoices (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  pedido_id TEXT,
  receipt_type TEXT,
  point_of_sale INTEGER,
  receipt_number INTEGER,
  cae TEXT,
  cae_vencimiento TEXT,
  issue_date TEXT,
  receptor_cuit TEXT,
  receptor_razon_social TEXT,
  receptor_condicion_iva TEXT,
  neto REAL,
  iva REAL,
  total REAL,
  moneda TEXT,
  afip_request TEXT,
  afip_response TEXT,
  emitido_por TEXT,
  created_at TEXT,
  linked_invoice_id TEXT,
  anulada INTEGER
);

CREATE TABLE IF NOT EXISTS item_modifiers (
  id TEXT PRIMARY KEY,
  item_carta_id TEXT,
  type TEXT,
  name TEXT,
  ingrediente_id TEXT,
  receta_id TEXT,
  saving_quantity TEXT,
  saving_unit TEXT,
  saving_cost REAL,
  ingrediente_extra_id TEXT,
  receta_extra_id TEXT,
  extra_quantity TEXT,
  extra_unit TEXT,
  extra_price REAL,
  extra_cost REAL,
  ingrediente_original_id TEXT,
  ingrediente_nuevo_id TEXT,
  new_quantity TEXT,
  new_unit TEXT,
  price_difference TEXT,
  cost_difference TEXT,
  is_active INTEGER,
  sort_order INTEGER,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS kitchen_stations (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  name TEXT,
  icon TEXT,
  sort_order INTEGER,
  kds_enabled INTEGER,
  printer_id TEXT,
  print_on TEXT,
  print_copies TEXT,
  is_active INTEGER,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS labor_config (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  monthly_hours_limit INTEGER,
  daily_hours_limit INTEGER,
  overtime_surcharge_pct REAL,
  holiday_surcharge_pct REAL,
  late_tolerance_total_min TEXT,
  late_tolerance_per_entry_min TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS manager_competencies (
  id TEXT PRIMARY KEY,
  key TEXT,
  name TEXT,
  description TEXT,
  sort_order INTEGER,
  is_active INTEGER,
  created_at TEXT,
  category TEXT,
  rubric_1 TEXT,
  rubric_3 TEXT,
  rubric_5 TEXT,
  icon TEXT
);

CREATE TABLE IF NOT EXISTS manual_consumptions (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  period TEXT,
  pl_category TEXT,
  consumed_amount REAL,
  type TEXT,
  details TEXT,
  notes TEXT,
  created_at TEXT,
  created_by TEXT,
  updated_at TEXT,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS meeting_agreement_assignees (
  id TEXT PRIMARY KEY,
  agreement_id TEXT,
  user_id TEXT
);

CREATE TABLE IF NOT EXISTS meeting_agreements (
  id TEXT PRIMARY KEY,
  meeting_id TEXT,
  description TEXT,
  sort_order INTEGER,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS meeting_participants (
  id TEXT PRIMARY KEY,
  meeting_id TEXT,
  user_id TEXT,
  attended INTEGER,
  read_at TEXT,
  created_at TEXT,
  was_present INTEGER,
  notified_at TEXT,
  reminder_count INTEGER
);

CREATE TABLE IF NOT EXISTS meetings (
  id TEXT PRIMARY KEY,
  title TEXT,
  date TEXT,
  area TEXT,
  branch_id TEXT,
  created_by TEXT,
  status TEXT,
  notes TEXT,
  created_at TEXT,
  updated_at TEXT,
  scheduled_at TEXT,
  started_at TEXT,
  closed_at TEXT,
  source TEXT
);

CREATE TABLE IF NOT EXISTS menu_categories (
  id TEXT PRIMARY KEY,
  name TEXT,
  description TEXT,
  sort_order INTEGER,
  is_active INTEGER,
  created_at TEXT,
  updated_at TEXT,
  is_visible_menu INTEGER,
  print_type TEXT
);

CREATE TABLE IF NOT EXISTS menu_item_compositions (
  id TEXT PRIMARY KEY,
  item_carta_id TEXT,
  preparacion_id TEXT,
  insumo_id TEXT,
  quantity REAL,
  sort_order INTEGER,
  created_at TEXT,
  is_removable INTEGER
);

CREATE TABLE IF NOT EXISTS menu_item_extras (
  id TEXT PRIMARY KEY,
  item_carta_id TEXT,
  preparacion_id TEXT,
  insumo_id TEXT,
  sort_order INTEGER,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS menu_item_option_group_items (
  id TEXT PRIMARY KEY,
  grupo_id TEXT,
  insumo_id TEXT,
  preparacion_id TEXT,
  quantity REAL,
  unit_cost REAL,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS menu_item_option_groups (
  id TEXT PRIMARY KEY,
  item_carta_id TEXT,
  name TEXT,
  sort_order INTEGER,
  average_cost REAL,
  created_at TEXT,
  updated_at TEXT,
  is_required INTEGER,
  max_selecciones INTEGER
);

CREATE TABLE IF NOT EXISTS menu_item_price_history (
  id TEXT PRIMARY KEY,
  item_carta_id TEXT,
  previous_price REAL,
  new_price REAL,
  reason TEXT,
  user_id TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS menu_items (
  id TEXT PRIMARY KEY,
  name TEXT,
  short_name TEXT,
  description TEXT,
  image_url TEXT,
  categoria_carta_id TEXT,
  rdo_category_code TEXT,
  base_price REAL,
  fc_objetivo REAL,
  total_cost REAL,
  fc_actual REAL,
  is_active INTEGER,
  available_delivery INTEGER,
  sort_order INTEGER,
  deleted_at TEXT,
  created_at TEXT,
  updated_at TEXT,
  type TEXT,
  composicion_ref_preparacion_id TEXT,
  composicion_ref_insumo_id TEXT,
  closure_category TEXT,
  reference_price REAL,
  kitchen_station_id TEXT,
  available_webapp INTEGER,
  promo_price REAL,
  promo_etiqueta TEXT
);

CREATE TABLE IF NOT EXISTS mercadopago_config (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  access_token TEXT,
  public_key TEXT,
  connection_status TEXT,
  webhook_secret TEXT,
  collector_id TEXT,
  last_test TEXT,
  last_test_ok TEXT,
  created_at TEXT,
  updated_at TEXT,
  device_id TEXT,
  device_name TEXT,
  device_operating_mode TEXT
);

CREATE TABLE IF NOT EXISTS operator_session_logs (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  current_user_id TEXT,
  previous_user_id TEXT,
  action_type TEXT,
  triggered_by TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS order_item_modifiers (
  id TEXT PRIMARY KEY,
  pedido_item_id TEXT,
  type TEXT,
  description TEXT,
  extra_price REAL,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  pedido_id TEXT,
  item_carta_id TEXT,
  name TEXT,
  quantity REAL,
  unit_price REAL,
  subtotal REAL,
  notes TEXT,
  estacion TEXT,
  status TEXT,
  created_at TEXT,
  reference_price REAL,
  categoria_carta_id TEXT,
  articulo_id TEXT,
  articulo_tipo TEXT,
  promocion_id TEXT,
  promocion_item_id TEXT
);

CREATE TABLE IF NOT EXISTS order_payment_edits (
  id TEXT PRIMARY KEY,
  pedido_id TEXT,
  pagos_antes TEXT,
  pagos_despues TEXT,
  reason TEXT,
  editado_por TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS order_payments (
  id TEXT PRIMARY KEY,
  pedido_id TEXT,
  method TEXT,
  amount REAL,
  received_amount REAL,
  vuelto TEXT,
  tarjeta_ultimos_4 TEXT,
  tarjeta_marca TEXT,
  mp_payment_id TEXT,
  transferencia_referencia TEXT,
  created_at TEXT,
  created_by TEXT,
  conciliado TEXT,
  conciliado_at TEXT
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  order_number INTEGER,
  caller_number INTEGER,
  type TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  cliente_notas TEXT,
  cadete_id TEXT,
  delivery_cost REAL,
  created_at TEXT,
  promised_time TEXT,
  ready_at_time TEXT,
  delivered_at_time TEXT,
  status TEXT,
  subtotal REAL,
  descuento REAL,
  descuento_motivo TEXT,
  total REAL,
  requires_invoice INTEGER,
  invoice_type TEXT,
  invoice_cuit TEXT,
  invoice_business_name TEXT,
  invoice_number INTEGER,
  invoice_cae TEXT,
  invoice_cae_expiry TEXT,
  created_by TEXT,
  canal_venta TEXT,
  service_type TEXT,
  canal_app TEXT,
  propina REAL,
  prep_started_at_time TEXT,
  source TEXT,
  pago_online_id TEXT,
  pago_estado TEXT,
  webapp_tracking_code TEXT,
  cliente_email TEXT,
  delivery_zone_id TEXT,
  confirmed_at_time TEXT,
  on_route_at_time TEXT,
  cliente_user_id TEXT,
  delivery_lat REAL,
  delivery_lng REAL,
  delivery_distance_km REAL,
  delivery_address TEXT,
  delivery_neighborhood TEXT,
  mp_payment_intent_id TEXT
);

CREATE TABLE IF NOT EXISTS pagers (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  number TEXT,
  en_uso TEXT,
  order_id TEXT,
  assigned_at TEXT
);

CREATE TABLE IF NOT EXISTS partner_movements (
  id TEXT PRIMARY KEY,
  socio_id TEXT,
  branch_id TEXT,
  type TEXT,
  date TEXT,
  amount REAL,
  details TEXT,
  period TEXT,
  resultado_periodo TEXT,
  cumulative_balance REAL,
  notes TEXT,
  created_at TEXT,
  created_by TEXT,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS partners (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  user_id TEXT,
  name TEXT,
  cuit TEXT,
  email TEXT,
  phone TEXT,
  ownership_percentage REAL,
  start_date TEXT,
  end_date TEXT,
  limite_retiro_mensual TEXT,
  is_active INTEGER,
  created_at TEXT,
  created_by TEXT,
  updated_at TEXT,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS periods (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  period TEXT,
  status TEXT,
  closed_at TEXT,
  closed_by TEXT,
  close_reason TEXT,
  approved_at TEXT,
  approved_by TEXT,
  reopened_at TEXT,
  reopened_by TEXT,
  reopen_reason TEXT,
  notes TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS permissions (
  id TEXT PRIMARY KEY,
  key TEXT,
  label TEXT,
  scope TEXT,
  category TEXT,
  is_editable INTEGER,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS pos_config (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  impresora_caja_ip TEXT,
  impresora_cocina_ip TEXT,
  default_prep_time TEXT,
  llamadores_habilitados TEXT,
  llamador_min TEXT,
  llamador_max TEXT,
  acepta_efectivo TEXT,
  acepta_debito TEXT,
  acepta_credito TEXT,
  acepta_mercadopago TEXT,
  acepta_transferencia TEXT,
  delivery_habilitado TEXT,
  default_delivery_cost REAL,
  radio_delivery_km REAL,
  invoicing_enabled TEXT,
  afip_punto_venta TEXT,
  afip_cuit TEXT,
  alertar_stock_minimo TEXT,
  alertar_stock_critico TEXT,
  pos_enabled TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS price_list_items (
  id TEXT PRIMARY KEY,
  price_list_id TEXT,
  item_carta_id TEXT,
  price REAL,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS price_lists (
  id TEXT PRIMARY KEY,
  name TEXT,
  channel TEXT,
  is_default INTEGER,
  is_active INTEGER,
  created_at TEXT,
  updated_at TEXT,
  pricing_mode TEXT,
  pricing_value TEXT,
  mirror_channel TEXT
);

CREATE TABLE IF NOT EXISTS print_config (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  ticket_printer_id TEXT,
  ticket_enabled TEXT,
  ticket_trigger TEXT,
  delivery_printer_id TEXT,
  delivery_enabled INTEGER,
  backup_printer_id TEXT,
  backup_enabled TEXT,
  reprint_requires_pin TEXT,
  updated_at TEXT,
  comanda_printer_id TEXT,
  vale_printer_id TEXT,
  salon_vales_enabled TEXT,
  no_salon_todo_en_comanda TEXT
);

CREATE TABLE IF NOT EXISTS print_jobs (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  printer_id TEXT,
  job_type TEXT,
  pedido_id TEXT,
  payload TEXT,
  status TEXT,
  attempts TEXT,
  error_message TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  is_active INTEGER,
  created_at TEXT,
  updated_at TEXT,
  pin_hash TEXT,
  dni TEXT,
  address TEXT,
  birth_date TEXT,
  cuit TEXT,
  cbu TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  dni_front_url TEXT,
  dni_back_url TEXT,
  accepted_terms_at TEXT,
  invitation_token TEXT,
  default_address TEXT,
  default_address_lat TEXT,
  default_address_lng TEXT,
  total_orders TEXT,
  total_spent TEXT,
  last_order_at TEXT,
  favorite_branch_id TEXT,
  internal_notes TEXT,
  loyalty_points TEXT,
  clock_pin TEXT,
  help_dismissed_pages TEXT,
  show_floating_help INTEGER,
  onboarding_completed_at TEXT,
  preferencia_pago TEXT
);

CREATE TABLE IF NOT EXISTS profit_distributions (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  period TEXT,
  resultado_neto TEXT,
  reserva_legal TEXT,
  otras_reservas TEXT,
  distributable_amount REAL,
  distribution_date TEXT,
  distribuciones TEXT,
  procesado INTEGER,
  process_date TEXT,
  notes TEXT,
  created_at TEXT,
  created_by TEXT,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS promotion_item_extras (
  id TEXT PRIMARY KEY,
  promocion_item_id TEXT,
  extra_item_carta_id TEXT,
  quantity REAL,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS promotion_items (
  id TEXT PRIMARY KEY,
  promocion_id TEXT,
  item_carta_id TEXT,
  promo_price REAL,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS promotions (
  id TEXT PRIMARY KEY,
  brand_id TEXT,
  name TEXT,
  description TEXT,
  type TEXT,
  value TEXT,
  restriccion_pago TEXT,
  dias_semana TEXT,
  hora_inicio TEXT,
  hora_fin TEXT,
  start_date TEXT,
  end_date TEXT,
  aplica_a TEXT,
  producto_ids TEXT,
  categoria_ids TEXT,
  user_type TEXT,
  is_active INTEGER,
  branch_ids TEXT,
  created_by TEXT,
  created_at TEXT,
  updated_at TEXT,
  deleted_at TEXT,
  canales TEXT
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  endpoint TEXT,
  keys TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS rdo_categories (
  code TEXT,
  name TEXT,
  parent_code TEXT,
  level INTEGER,
  rdo_section TEXT,
  behavior TEXT,
  allowed_item_types TEXT,
  sort_order INTEGER,
  is_active INTEGER,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS rdo_movements (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  period TEXT,
  rdo_category_code TEXT,
  source TEXT,
  amount REAL,
  description TEXT,
  extra_data TEXT,
  source_table TEXT,
  source_id TEXT,
  created_by TEXT,
  created_at TEXT,
  updated_at TEXT,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS recipe_categories (
  id TEXT PRIMARY KEY,
  name TEXT,
  sort_order INTEGER,
  is_active INTEGER,
  deleted_at TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id TEXT PRIMARY KEY,
  preparacion_id TEXT,
  insumo_id TEXT,
  quantity REAL,
  unit TEXT,
  sort_order INTEGER,
  created_at TEXT,
  sub_preparacion_id TEXT
);

CREATE TABLE IF NOT EXISTS recipe_options (
  id TEXT PRIMARY KEY,
  preparacion_id TEXT,
  insumo_id TEXT,
  sort_order INTEGER,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS recipes (
  id TEXT PRIMARY KEY,
  name TEXT,
  description TEXT,
  type TEXT,
  is_interchangeable INTEGER,
  costing_method TEXT,
  manual_cost REAL,
  calculated_cost REAL,
  is_active INTEGER,
  deleted_at TEXT,
  created_at TEXT,
  updated_at TEXT,
  categoria_preparacion_id TEXT,
  extra_price REAL,
  can_be_extra INTEGER,
  extra_target_fc TEXT
);

CREATE TABLE IF NOT EXISTS register_shifts_legacy (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  cashier_id TEXT,
  opened_at TEXT,
  opening_fund TEXT,
  closed_at TEXT,
  total_cash TEXT,
  total_debit TEXT,
  total_credit REAL,
  total_mercadopago TEXT,
  total_transfer TEXT,
  total_sales REAL,
  cash_counted TEXT,
  difference REAL,
  difference_reason TEXT,
  cash_withdrawals TEXT,
  status TEXT
);

CREATE TABLE IF NOT EXISTS regulation_signatures (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  regulation_id TEXT,
  branch_id TEXT,
  signed_document_url TEXT,
  signed_at TEXT,
  uploaded_by TEXT,
  created_at TEXT,
  regulation_version TEXT
);

CREATE TABLE IF NOT EXISTS regulations (
  id TEXT PRIMARY KEY,
  version TEXT,
  title TEXT,
  document_url TEXT,
  effective_date TEXT,
  created_by TEXT,
  created_at TEXT,
  is_active INTEGER,
  description TEXT,
  pdf_url TEXT,
  published_at TEXT
);

CREATE TABLE IF NOT EXISTS removable_items (
  id TEXT PRIMARY KEY,
  item_carta_id TEXT,
  insumo_id TEXT,
  display_name TEXT,
  is_active INTEGER,
  created_at TEXT,
  preparacion_id TEXT
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id TEXT,
  permission_id TEXT
);

CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  key TEXT,
  display_name TEXT,
  scope TEXT,
  hierarchy_level INTEGER,
  is_system INTEGER,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS salary_advances (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  employee_id TEXT,
  amount REAL,
  reason TEXT,
  payment_method TEXT,
  status TEXT,
  authorized_by TEXT,
  authorized_at TEXT,
  paid_by TEXT,
  paid_at TEXT,
  shift_id TEXT,
  transferred_by TEXT,
  transferred_at TEXT,
  transfer_reference TEXT,
  deducted_in_payroll_id TEXT,
  deducted_at TEXT,
  created_by TEXT,
  created_at TEXT,
  updated_at TEXT,
  notes TEXT,
  user_id TEXT
);

CREATE TABLE IF NOT EXISTS sales_channels (
  id TEXT PRIMARY KEY,
  code TEXT,
  name TEXT,
  adjustment_type TEXT,
  adjustment_value TEXT,
  is_base INTEGER,
  is_active INTEGER,
  sort_order INTEGER,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS schedule_requests (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  user_id TEXT,
  request_type TEXT,
  request_date TEXT,
  reason TEXT,
  status TEXT,
  response_note TEXT,
  responded_by TEXT,
  responded_at TEXT,
  created_at TEXT,
  evidence_url TEXT,
  absence_type TEXT
);

CREATE TABLE IF NOT EXISTS service_concepts (
  id TEXT PRIMARY KEY,
  name TEXT,
  description TEXT,
  expense_category TEXT,
  subcategory TEXT,
  type TEXT,
  is_calculated INTEGER,
  formula_calculo TEXT,
  proveedor_id TEXT,
  periodicidad TEXT,
  is_active INTEGER,
  created_at TEXT,
  updated_at TEXT,
  deleted_at TEXT,
  rdo_category_code TEXT,
  is_visible_local INTEGER
);

CREATE TABLE IF NOT EXISTS shift_closures (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  date TEXT,
  shift TEXT,
  burgers TEXT,
  local_sales TEXT,
  app_sales TEXT,
  total_invoiced TEXT,
  total_burgers TEXT,
  total_sold TEXT,
  total_cash TEXT,
  total_digital TEXT,
  expected_invoicing TEXT,
  invoicing_difference TEXT,
  has_invoicing_alert INTEGER,
  notes TEXT,
  closed_by TEXT,
  closed_at TEXT,
  updated_at TEXT,
  updated_by TEXT,
  register_reconciliation TEXT,
  posnet_difference TEXT,
  apps_difference TEXT,
  has_posnet_alert INTEGER,
  has_apps_alert INTEGER,
  has_register_alert INTEGER,
  source TEXT
);

CREATE TABLE IF NOT EXISTS special_days (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  day_date TEXT,
  day_type TEXT,
  description TEXT,
  user_id TEXT,
  created_by TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS staff_invitations (
  id TEXT PRIMARY KEY,
  email TEXT,
  branch_id TEXT,
  invited_by TEXT,
  token TEXT,
  status TEXT,
  expires_at TEXT,
  accepted_at TEXT,
  accepted_by TEXT,
  created_at TEXT,
  role TEXT,
  full_name TEXT
);

CREATE TABLE IF NOT EXISTS station_competencies (
  id TEXT PRIMARY KEY,
  station_id TEXT,
  key TEXT,
  name TEXT,
  description TEXT,
  sort_order INTEGER,
  is_active INTEGER,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS stock_actual (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  insumo_id TEXT,
  quantity REAL,
  unit TEXT,
  stock_minimo INTEGER,
  stock_critico INTEGER,
  updated_at TEXT,
  stock_minimo_local INTEGER,
  stock_critico_local INTEGER
);

CREATE TABLE IF NOT EXISTS stock_cierre_mensual (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  insumo_id TEXT,
  period TEXT,
  stock_apertura INTEGER,
  compras TEXT,
  consumo_ventas TEXT,
  stock_esperado INTEGER,
  stock_cierre_fisico INTEGER,
  merma TEXT,
  created_at TEXT,
  created_by TEXT
);

CREATE TABLE IF NOT EXISTS stock_conteo_items (
  id TEXT PRIMARY KEY,
  conteo_id TEXT,
  insumo_id TEXT,
  stock_teorico INTEGER,
  stock_real INTEGER,
  unit_cost REAL
);

CREATE TABLE IF NOT EXISTS stock_conteos (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  date TEXT,
  period TEXT,
  nota_general TEXT,
  resumen TEXT,
  status TEXT,
  created_by TEXT,
  confirmed_at TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  insumo_id TEXT,
  type TEXT,
  quantity REAL,
  quantity_before TEXT,
  quantity_after TEXT,
  pedido_id TEXT,
  supplier_invoice_id TEXT,
  reason TEXT,
  created_at TEXT,
  created_by TEXT,
  note TEXT
);

CREATE TABLE IF NOT EXISTS supplier_branch_terms (
  id TEXT PRIMARY KEY,
  proveedor_id TEXT,
  branch_id TEXT,
  permite_cuenta_corriente TEXT,
  dias_pago_habitual TEXT,
  descuento_pago_contado TEXT,
  notes TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS supplier_invoices (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  proveedor_id TEXT,
  invoice_type TEXT,
  invoice_number INTEGER,
  invoice_date TEXT,
  invoice_url TEXT,
  subtotal REAL,
  iva REAL,
  otros_impuestos TEXT,
  total REAL,
  payment_terms TEXT,
  due_date TEXT,
  payment_status TEXT,
  pending_balance REAL,
  type TEXT,
  extraordinary_reason TEXT,
  period TEXT,
  notes TEXT,
  created_at TEXT,
  created_by TEXT,
  updated_at TEXT,
  deleted_at TEXT,
  subtotal_bruto REAL,
  total_descuentos REAL,
  subtotal_neto REAL,
  imp_internos REAL,
  iva_21 TEXT,
  iva_105 TEXT,
  perc_iva REAL,
  perc_provincial REAL,
  perc_municipal REAL,
  invoice_total REAL,
  actual_cost REAL
);

CREATE TABLE IF NOT EXISTS supplier_payments (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  proveedor_id TEXT,
  invoice_id TEXT,
  payment_date TEXT,
  amount REAL,
  payment_method TEXT,
  reference TEXT,
  payment_data REAL,
  notes TEXT,
  created_at TEXT,
  created_by TEXT,
  deleted_at TEXT,
  is_verified INTEGER,
  verified_by TEXT,
  verified_at TEXT,
  verified_notes TEXT,
  payment_due_date TEXT
);

CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  ambito TEXT,
  branch_id TEXT,
  business_name TEXT,
  cuit TEXT,
  contact TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  medios_pago_aceptados TEXT,
  permite_cuenta_corriente TEXT,
  dias_pago_habitual TEXT,
  descuento_pago_contado TEXT,
  is_active INTEGER,
  notes TEXT,
  created_at TEXT,
  created_by TEXT,
  updated_at TEXT,
  deleted_at TEXT,
  special_type TEXT,
  banco TEXT,
  account_number TEXT,
  cbu TEXT,
  alias_cbu TEXT,
  titular_cuenta TEXT,
  secondary_phone TEXT,
  secondary_contact TEXT,
  supplier_type TEXT,
  rdo_categories_default TEXT
);

CREATE TABLE IF NOT EXISTS supplies (
  id TEXT PRIMARY KEY,
  name TEXT,
  categoria_id TEXT,
  base_unit TEXT,
  pl_category TEXT,
  creado_por TEXT,
  is_active INTEGER,
  proveedor_sugerido_id TEXT,
  reference_price REAL,
  description TEXT,
  created_at TEXT,
  updated_at TEXT,
  deleted_at TEXT,
  nivel_control TEXT,
  especificacion TEXT,
  proveedor_obligatorio_id TEXT,
  max_suggested_price REAL,
  control_reason TEXT,
  item_type TEXT,
  rdo_category_code TEXT,
  tracks_stock INTEGER,
  purchase_unit TEXT,
  purchase_unit_content TEXT,
  purchase_unit_price REAL,
  base_unit_cost REAL,
  default_alicuota_iva TEXT,
  sale_price REAL,
  margen_bruto REAL,
  margen_porcentaje REAL,
  extra_price REAL,
  can_be_extra INTEGER,
  extra_target_fc TEXT
);

CREATE TABLE IF NOT EXISTS supply_categories (
  id TEXT PRIMARY KEY,
  name TEXT,
  type TEXT,
  description TEXT,
  sort_order INTEGER,
  is_active INTEGER,
  created_at TEXT,
  updated_at TEXT,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS supply_cost_history (
  id TEXT PRIMARY KEY,
  insumo_id TEXT,
  branch_id TEXT,
  previous_cost REAL,
  new_cost REAL,
  invoice_id TEXT,
  reason TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS tax_config (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  iibb_alicuota TEXT,
  tasas_municipales TEXT,
  otros_impuestos TEXT,
  vigencia_desde TEXT,
  vigencia_hasta TEXT,
  notes TEXT,
  created_at TEXT,
  updated_at TEXT,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS user_role_assignments (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  role_id TEXT,
  branch_id TEXT,
  is_active INTEGER,
  created_at TEXT,
  clock_pin TEXT,
  default_position TEXT
);

CREATE TABLE IF NOT EXISTS warnings (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  branch_id TEXT,
  warning_type TEXT,
  description TEXT,
  warning_date TEXT,
  issued_by TEXT,
  acknowledged_at TEXT,
  is_active INTEGER,
  created_at TEXT,
  signed_document_url TEXT
);

CREATE TABLE IF NOT EXISTS webapp_config (
  id TEXT PRIMARY KEY,
  branch_id TEXT,
  status TEXT,
  delivery_habilitado TEXT,
  delivery_radio_km REAL,
  delivery_costo TEXT,
  delivery_pedido_minimo TEXT,
  retiro_habilitado TEXT,
  comer_aca_habilitado TEXT,
  recepcion_modo TEXT,
  estimated_pickup_time_min TEXT,
  estimated_delivery_time_min TEXT,
  horarios TEXT,
  pause_message TEXT,
  created_at TEXT,
  updated_at TEXT,
  webapp_activa TEXT,
  service_schedules TEXT,
  prep_time_retiro TEXT,
  prep_time_delivery TEXT,
  prep_time_comer_aca TEXT,
  auto_accept_orders INTEGER,
  auto_print_orders INTEGER
);

CREATE TABLE IF NOT EXISTS webapp_order_messages (
  id TEXT PRIMARY KEY,
  pedido_id TEXT,
  branch_id TEXT,
  sender_type TEXT,
  sender_id TEXT,
  sender_name TEXT,
  message TEXT,
  leido TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id TEXT PRIMARY KEY,
  subject_type TEXT,
  template_text TEXT,
  is_active INTEGER,
  updated_by TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS work_positions (
  id TEXT PRIMARY KEY,
  key TEXT,
  label TEXT,
  sort_order INTEGER,
  is_active INTEGER,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS work_stations (
  id TEXT PRIMARY KEY,
  key TEXT,
  name TEXT,
  icon TEXT,
  sort_order INTEGER,
  is_active INTEGER,
  created_at TEXT
);

`);

console.log('All 131 tables + users created successfully!');
sqlite.close();
