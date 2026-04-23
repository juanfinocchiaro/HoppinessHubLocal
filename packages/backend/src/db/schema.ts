import { sqliteTable, text, integer, real, uniqueIndex } from 'drizzle-orm/sqlite-core';

// ============================================================================
// AUTH
// ============================================================================

export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').notNull(),
  password_hash: text('password_hash'),
  email_confirmed_at: text('email_confirmed_at'),
  last_sign_in_at: text('last_sign_in_at'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
}, (table) => [
  uniqueIndex('users_email_idx').on(table.email),
]);

export const profiles = sqliteTable('profiles', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email'),
  full_name: text('full_name'),
  avatar_url: text('avatar_url'),
  phone: text('phone'),
  clock_pin: text('clock_pin'),
  is_active: integer('is_active', { mode: 'boolean' }),
  email_confirmed_at: text('email_confirmed_at'),
  last_sign_in_at: text('last_sign_in_at'),
  onboarding_completed: integer('onboarding_completed', { mode: 'boolean' }),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

// ============================================================================
// ROLES & PERMISSIONS
// ============================================================================

export const roles = sqliteTable('roles', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  key: text('key'),
  label: text('label'),
  description: text('description'),
  scope: text('scope'),
  is_system: integer('is_system', { mode: 'boolean' }),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const permissions = sqliteTable('permissions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  key: text('key'),
  label: text('label'),
  description: text('description'),
  scope: text('scope'),
  module: text('module'),
  sort_order: integer('sort_order'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const role_permissions = sqliteTable('role_permissions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  role_id: text('role_id'),
  permission_id: text('permission_id'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const user_role_assignments = sqliteTable('user_role_assignments', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  user_id: text('user_id'),
  role_id: text('role_id'),
  branch_id: text('branch_id'),
  assigned_by: text('assigned_by'),
  is_active: integer('is_active', { mode: 'boolean' }),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

// ============================================================================
// BRANCHES & BRANCH CONFIG
// ============================================================================

export const branches = sqliteTable('branches', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  slug: text('slug'),
  address: text('address'),
  city: text('city'),
  phone: text('phone'),
  email: text('email'),
  latitude: real('latitude'),
  longitude: real('longitude'),
  is_active: integer('is_active', { mode: 'boolean' }),
  is_open: integer('is_open', { mode: 'boolean' }),
  local_open_state: integer('local_open_state', { mode: 'boolean' }),
  opening_time: text('opening_time'),
  closing_time: text('closing_time'),
  public_hours: text('public_hours', { mode: 'json' }),
  public_status: text('public_status'),
  clock_code: text('clock_code'),
  clock_window_before_min: integer('clock_window_before_min'),
  clock_window_after_min: integer('clock_window_after_min'),
  cover_image_url: text('cover_image_url'),
  google_place_id: text('google_place_id'),
  enforce_labor_law: integer('enforce_labor_law', { mode: 'boolean' }),
  expense_pin_threshold: real('expense_pin_threshold'),
  admin_force_state: text('admin_force_state'),
  admin_force_message: text('admin_force_message'),
  admin_force_channels: text('admin_force_channels', { mode: 'json' }),
  shifts_morning_enabled: integer('shifts_morning_enabled', { mode: 'boolean' }),
  shifts_overnight_enabled: integer('shifts_overnight_enabled', { mode: 'boolean' }),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const branch_shifts = sqliteTable('branch_shifts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  branch_id: text('branch_id'),
  name: text('name'),
  start_time: text('start_time'),
  end_time: text('end_time'),
  is_active: integer('is_active', { mode: 'boolean' }),
  sort_order: integer('sort_order'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const branch_printers = sqliteTable('branch_printers', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  branch_id: text('branch_id'),
  name: text('name'),
  connection_type: text('connection_type'),
  ip_address: text('ip_address'),
  port: integer('port'),
  paper_width: integer('paper_width'),
  is_active: integer('is_active', { mode: 'boolean' }),
  configured_from_network: text('configured_from_network'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const branch_inspections = sqliteTable('branch_inspections', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  branch_id: text('branch_id'),
  inspector_id: text('inspector_id'),
  present_manager_id: text('present_manager_id'),
  inspection_type: text('inspection_type'),
  status: text('status'),
  started_at: text('started_at'),
  completed_at: text('completed_at'),
  score_total: real('score_total'),
  general_notes: text('general_notes'),
  critical_findings: text('critical_findings'),
  action_items: text('action_items', { mode: 'json' }),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const branch_item_availability = sqliteTable('branch_item_availability', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  branch_id: text('branch_id'),
  item_carta_id: text('item_carta_id'),
  available: integer('available', { mode: 'boolean' }),
  available_salon: integer('available_salon', { mode: 'boolean' }),
  available_webapp: integer('available_webapp', { mode: 'boolean' }),
  out_of_stock: integer('out_of_stock', { mode: 'boolean' }),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const branch_monthly_sales = sqliteTable('branch_monthly_sales', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  branch_id: text('branch_id'),
  period: text('period'),
  source: text('source'),
  total_sales: real('total_sales'),
  cash_total: real('cash_total'),
  online_total: real('online_total'),
  cash: real('cash'),
  cash_percentage: real('cash_percentage'),
  notes: text('notes'),
  loaded_by: text('loaded_by'),
  loaded_at: text('loaded_at'),
  deleted_at: text('deleted_at'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const branch_closure_config = sqliteTable('branch_closure_config', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  branch_id: text('branch_id'),
  config_id: text('config_id'),
  enabled: integer('enabled', { mode: 'boolean' }),
});

export const branch_delivery_config = sqliteTable('branch_delivery_config', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  branch_id: text('branch_id'),
  delivery_enabled: integer('delivery_enabled', { mode: 'boolean' }),
  default_radius_km: real('default_radius_km'),
  radius_override_km: real('radius_override_km'),
  radius_override_by: text('radius_override_by'),
  radius_override_until: text('radius_override_until'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const branch_delivery_neighborhoods = sqliteTable('branch_delivery_neighborhoods', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  branch_id: text('branch_id'),
  neighborhood_id: text('neighborhood_id'),
  status: text('status'),
  distance_km: real('distance_km'),
  decided_by: text('decided_by'),
  block_reason: text('block_reason'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const brand_closure_config = sqliteTable('brand_closure_config', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  key: text('key'),
  label: text('label'),
  type: text('type'),
  categoria_padre: text('categoria_padre'),
  is_active: integer('is_active', { mode: 'boolean' }),
  sort_order: integer('sort_order'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const brand_sidebar_order = sqliteTable('brand_sidebar_order', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  section_id: text('section_id'),
  sort_order: integer('sort_order'),
  updated_by: text('updated_by'),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

// ============================================================================
// AFIP & FISCAL
// ============================================================================

export const afip_config = sqliteTable('afip_config', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  branch_id: text('branch_id'),
  cuit: text('cuit'),
  business_name: text('business_name'),
  fiscal_address: text('fiscal_address'),
  activity_start_date: text('activity_start_date'),
  point_of_sale: integer('point_of_sale'),
  certificado_crt: text('certificado_crt'),
  csr_pem: text('csr_pem'),
  private_key_enc: text('private_key_enc'),
  certificate_status: text('certificate_status'),
  connection_status: text('connection_status'),
  is_production: integer('is_production', { mode: 'boolean' }),
  last_error: text('last_error'),
  last_verification: text('last_verification'),
  invoicing_rules: text('invoicing_rules', { mode: 'json' }),
  last_invoice_number_a: integer('last_invoice_number_a'),
  last_invoice_number_b: integer('last_invoice_number_b'),
  last_invoice_number_c: integer('last_invoice_number_c'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const afip_errores_log = sqliteTable('afip_errores_log', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  branch_id: text('branch_id'),
  error_type: text('error_type'),
  afip_code: text('afip_code'),
  message: text('message'),
  request_data: text('request_data', { mode: 'json' }),
  response_data: text('response_data', { mode: 'json' }),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const fiscal_z_closings = sqliteTable('fiscal_z_closings', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  branch_id: text('branch_id'),
  closing_date: text('closing_date'),
  shift_label: text('shift_label'),
  z_number: integer('z_number'),
  total_a: real('total_a'),
  total_b: real('total_b'),
  total_c: real('total_c'),
  invoices_a: integer('invoices_a'),
  invoices_b: integer('invoices_b'),
  invoices_c: integer('invoices_c'),
  credit_notes_a: integer('credit_notes_a'),
  credit_notes_b: integer('credit_notes_b'),
  credit_notes_c: integer('credit_notes_c'),
  from_number_a: integer('from_number_a'),
  to_number_a: integer('to_number_a'),
  from_number_b: integer('from_number_b'),
  to_number_b: integer('to_number_b'),
  from_number_c: integer('from_number_c'),
  to_number_c: integer('to_number_c'),
  total_amount: real('total_amount'),
  total_invoices: integer('total_invoices'),
  notes: text('notes'),
  generated_by: text('generated_by'),
  printed_at: text('printed_at'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const issued_invoices = sqliteTable('issued_invoices', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  branch_id: text('branch_id'),
  invoice_type: text('invoice_type'),
  receipt_type: text('receipt_type'),
  point_of_sale: integer('point_of_sale'),
  invoice_number: integer('invoice_number'),
  issue_date: text('issue_date'),
  customer_name: text('customer_name'),
  customer_doc_type: text('customer_doc_type'),
  customer_doc_number: text('customer_doc_number'),
  total_amount: real('total_amount'),
  net_amount: real('net_amount'),
  iva_amount: real('iva_amount'),
  other_taxes: real('other_taxes'),
  cae: text('cae'),
  cae_expiry: text('cae_expiry'),
  afip_result: text('afip_result'),
  afip_response: text('afip_response', { mode: 'json' }),
  original_invoice_id: text('original_invoice_id'),
  order_id: text('order_id'),
  voided_at: text('voided_at'),
  voided_by: text('voided_by'),
  voided_reason: text('voided_reason'),
  created_by: text('created_by'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const invoice_items = sqliteTable('invoice_items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  invoice_id: text('invoice_id'),
  description: text('description'),
  quantity: real('quantity'),
  unit_price: real('unit_price'),
  subtotal: real('subtotal'),
  iva_rate: real('iva_rate'),
  iva_amount: real('iva_amount'),
  total: real('total'),
  product_code: text('product_code'),
  unit_code: text('unit_code'),
  bonus_percentage: real('bonus_percentage'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const invoice_payment_links = sqliteTable('invoice_payment_links', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  invoice_id: text('invoice_id'),
  payment_id: text('payment_id'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const tax_config = sqliteTable('tax_config', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  branch_id: text('branch_id'),
  iibb_rate: real('iibb_rate'),
  municipal_rate: real('municipal_rate'),
  other_tax_rate: real('other_tax_rate'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

// ============================================================================
// AUDIT & LOGGING
// ============================================================================

export const audit_logs = sqliteTable('audit_logs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  user_id: text('user_id'),
  table_name: text('table_name'),
  action: text('action'),
  record_id: text('record_id'),
  old_data: text('old_data', { mode: 'json' }),
  new_data: text('new_data', { mode: 'json' }),
  ip_address: text('ip_address'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const financial_audit_log = sqliteTable('financial_audit_log', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  entity_type: text('entity_type'),
  entity_id: text('entity_id'),
  action: text('action'),
  old_data: text('old_data', { mode: 'json' }),
  new_data: text('new_data', { mode: 'json' }),
  performed_by: text('performed_by'),
  branch_id: text('branch_id'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
});

// ============================================================================
// MENU & CATEGORIES
// ============================================================================

export const menu_categories = sqliteTable('menu_categories', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  description: text('description'),
  sort_order: integer('sort_order'),
  is_active: integer('is_active', { mode: 'boolean' }),
  icon: text('icon'),
  color: text('color'),
  parent_id: text('parent_id'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const menu_items = sqliteTable('menu_items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  description: text('description'),
  category_id: text('category_id'),
  base_price: real('base_price'),
  image_url: text('image_url'),
  is_active: integer('is_active', { mode: 'boolean' }),
  sort_order: integer('sort_order'),
  kitchen_station_id: text('kitchen_station_id'),
  preparation_time_min: integer('preparation_time_min'),
  tags: text('tags', { mode: 'json' }),
  allergens: text('allergens', { mode: 'json' }),
  is_combo: integer('is_combo', { mode: 'boolean' }),
  combo_items: text('combo_items', { mode: 'json' }),
  cost: real('cost'),
  margin_percentage: real('margin_percentage'),
  sku: text('sku'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const menu_item_extras = sqliteTable('menu_item_extras', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  menu_item_id: text('menu_item_id'),
  extra_name: text('extra_name'),
  extra_price: real('extra_price'),
  is_active: integer('is_active', { mode: 'boolean' }),
  sort_order: integer('sort_order'),
  category: text('category'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const menu_item_option_groups = sqliteTable('menu_item_option_groups', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  menu_item_id: text('menu_item_id'),
  name: text('name'),
  is_required: integer('is_required', { mode: 'boolean' }),
  min_selections: integer('min_selections'),
  max_selections: integer('max_selections'),
  sort_order: integer('sort_order'),
  is_active: integer('is_active', { mode: 'boolean' }),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const menu_item_option_group_items = sqliteTable('menu_item_option_group_items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  group_id: text('group_id'),
  name: text('name'),
  price_adjustment: real('price_adjustment'),
  is_default: integer('is_default', { mode: 'boolean' }),
  sort_order: integer('sort_order'),
  is_active: integer('is_active', { mode: 'boolean' }),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const menu_item_compositions = sqliteTable('menu_item_compositions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  menu_item_id: text('menu_item_id'),
  recipe_id: text('recipe_id'),
  quantity: real('quantity'),
  unit: text('unit'),
  notes: text('notes'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const menu_item_price_history = sqliteTable('menu_item_price_history', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  menu_item_id: text('menu_item_id'),
  old_price: real('old_price'),
  new_price: real('new_price'),
  changed_by: text('changed_by'),
  change_reason: text('change_reason'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const item_modifiers = sqliteTable('item_modifiers', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  menu_item_id: text('menu_item_id'),
  name: text('name'),
  type: text('type'),
  options: text('options', { mode: 'json' }),
  is_required: integer('is_required', { mode: 'boolean' }),
  max_selections: integer('max_selections'),
  sort_order: integer('sort_order'),
  is_active: integer('is_active', { mode: 'boolean' }),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const extra_assignments = sqliteTable('extra_assignments', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  menu_item_id: text('menu_item_id'),
  extra_item_id: text('extra_item_id'),
  is_active: integer('is_active', { mode: 'boolean' }),
  sort_order: integer('sort_order'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const removable_items = sqliteTable('removable_items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  menu_item_id: text('menu_item_id'),
  ingredient_name: text('ingredient_name'),
  is_active: integer('is_active', { mode: 'boolean' }),
  sort_order: integer('sort_order'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const kitchen_stations = sqliteTable('kitchen_stations', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  branch_id: text('branch_id'),
  name: text('name'),
  color: text('color'),
  sort_order: integer('sort_order'),
  is_active: integer('is_active', { mode: 'boolean' }),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const price_lists = sqliteTable('price_lists', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  description: text('description'),
  channel_id: text('channel_id'),
  is_active: integer('is_active', { mode: 'boolean' }),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const price_list_items = sqliteTable('price_list_items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  price_list_id: text('price_list_id'),
  menu_item_id: text('menu_item_id'),
  price: real('price'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const sales_channels = sqliteTable('sales_channels', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  slug: text('slug'),
  description: text('description'),
  is_active: integer('is_active', { mode: 'boolean' }),
  sort_order: integer('sort_order'),
  icon: text('icon'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

// ============================================================================
// RECIPES & SUPPLIES
// ============================================================================

export const recipe_categories = sqliteTable('recipe_categories', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  sort_order: integer('sort_order'),
  is_active: integer('is_active', { mode: 'boolean' }),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const recipes = sqliteTable('recipes', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  description: text('description'),
  category_id: text('category_id'),
  yield_quantity: real('yield_quantity'),
  yield_unit: text('yield_unit'),
  cost_per_unit: real('cost_per_unit'),
  total_cost: real('total_cost'),
  instructions: text('instructions'),
  is_active: integer('is_active', { mode: 'boolean' }),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const recipe_ingredients = sqliteTable('recipe_ingredients', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  recipe_id: text('recipe_id'),
  supply_id: text('supply_id'),
  quantity: real('quantity'),
  unit: text('unit'),
  waste_percentage: real('waste_percentage'),
  notes: text('notes'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const recipe_options = sqliteTable('recipe_options', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  recipe_id: text('recipe_id'),
  name: text('name'),
  additional_cost: real('additional_cost'),
  is_default: integer('is_default', { mode: 'boolean' }),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const supply_categories = sqliteTable('supply_categories', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  sort_order: integer('sort_order'),
  is_active: integer('is_active', { mode: 'boolean' }),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const supplies = sqliteTable('supplies', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  category_id: text('category_id'),
  unit: text('unit'),
  cost_per_unit: real('cost_per_unit'),
  min_stock: real('min_stock'),
  is_active: integer('is_active', { mode: 'boolean' }),
  sku: text('sku'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const supply_cost_history = sqliteTable('supply_cost_history', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  supply_id: text('supply_id'),
  old_cost: real('old_cost'),
  new_cost: real('new_cost'),
  changed_by: text('changed_by'),
  change_reason: text('change_reason'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
});

// ============================================================================
// STOCK
// ============================================================================

export const stock_actual = sqliteTable('stock_actual', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  branch_id: text('branch_id'),
  supply_id: text('supply_id'),
  current_quantity: real('current_quantity'),
  unit: text('unit'),
  last_updated_by: text('last_updated_by'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const stock_cierre_mensual = sqliteTable('stock_cierre_mensual', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  branch_id: text('branch_id'),
  period: text('period'),
  supply_id: text('supply_id'),
  quantity: real('quantity'),
  unit: text('unit'),
  closed_by: text('closed_by'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const stock_conteos = sqliteTable('stock_conteos', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  branch_id: text('branch_id'),
  conteo_date: text('conteo_date'),
  status: text('status'),
  notes: text('notes'),
  created_by: text('created_by'),
  approved_by: text('approved_by'),
  approved_at: text('approved_at'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const stock_conteo_items = sqliteTable('stock_conteo_items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  conteo_id: text('conteo_id'),
  supply_id: text('supply_id'),
  counted_quantity: real('counted_quantity'),
  system_quantity: real('system_quantity'),
  difference: real('difference'),
  unit: text('unit'),
  notes: text('notes'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const stock_movements = sqliteTable('stock_movements', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  branch_id: text('branch_id'),
  supply_id: text('supply_id'),
  movement_type: text('movement_type'),
  quantity: real('quantity'),
  unit: text('unit'),
  reference_id: text('reference_id'),
  notes: text('notes'),
  created_by: text('created_by'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
});

// ============================================================================
// ORDERS & POS
// ============================================================================

export const orders = sqliteTable('orders', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  branch_id: text('branch_id'),
  order_number: integer('order_number'),
  customer_name: text('customer_name'),
  customer_phone: text('customer_phone'),
  customer_email: text('customer_email'),
  customer_address: text('customer_address'),
  customer_floor: text('customer_floor'),
  customer_reference: text('customer_reference'),
  customer_latitude: real('customer_latitude'),
  customer_longitude: real('customer_longitude'),
  order_type: text('order_type'),
  area: text('area'),
  status: text('status'),
  subtotal: real('subtotal'),
  discount_amount: real('discount_amount'),
  discount_code: text('discount_code'),
  promotion_id: text('promotion_id'),
  delivery_cost: real('delivery_cost'),
  total: real('total'),
  notes: text('notes'),
  source: text('source'),
  payment_method: text('payment_method'),
  created_by: text('created_by'),
  assigned_to: text('assigned_to'),
  estimated_prep_time: integer('estimated_prep_time'),
  confirmed_at: text('confirmed_at'),
  preparing_at: text('preparing_at'),
  ready_at: text('ready_at'),
  picked_up_at: text('picked_up_at'),
  delivered_at: text('delivered_at'),
  cancelled_at: text('cancelled_at'),
  cancel_reason: text('cancel_reason'),
  delivery_driver_id: text('delivery_driver_id'),
  delivery_tracking_code: text('delivery_tracking_code'),
  webapp_tracking_code: text('webapp_tracking_code'),
  is_webapp: integer('is_webapp', { mode: 'boolean' }),
  pager_number: integer('pager_number'),
  table_number: text('table_number'),
  printed_at: text('printed_at'),
  customer_user_id: text('customer_user_id'),
  neighborhood_id: text('neighborhood_id'),
  fiscal_status: text('fiscal_status'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const order_items = sqliteTable('order_items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  order_id: text('order_id'),
  menu_item_id: text('menu_item_id'),
  item_name: text('item_name'),
  quantity: integer('quantity'),
  unit_price: real('unit_price'),
  subtotal: real('subtotal'),
  notes: text('notes'),
  kitchen_station_id: text('kitchen_station_id'),
  status: text('status'),
  extras: text('extras', { mode: 'json' }),
  removals: text('removals', { mode: 'json' }),
  is_gift: integer('is_gift', { mode: 'boolean' }),
  gift_reason: text('gift_reason'),
  discount_amount: real('discount_amount'),
  original_price: real('original_price'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const order_item_modifiers = sqliteTable('order_item_modifiers', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  order_item_id: text('order_item_id'),
  modifier_name: text('modifier_name'),
  modifier_type: text('modifier_type'),
  selected_options: text('selected_options', { mode: 'json' }),
  price_adjustment: real('price_adjustment'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const order_payments = sqliteTable('order_payments', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  order_id: text('order_id'),
  payment_method: text('payment_method'),
  amount: real('amount'),
  reference: text('reference'),
  status: text('status'),
  mp_payment_id: text('mp_payment_id'),
  mp_status: text('mp_status'),
  mp_status_detail: text('mp_status_detail'),
  point_payment_intent_id: text('point_payment_intent_id'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const order_payment_edits = sqliteTable('order_payment_edits', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  order_id: text('order_id'),
  original_payments: text('original_payments', { mode: 'json' }),
  new_payments: text('new_payments', { mode: 'json' }),
  edited_by: text('edited_by'),
  edit_reason: text('edit_reason'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const pagers = sqliteTable('pagers', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  branch_id: text('branch_id'),
  pager_number: integer('pager_number'),
  is_available: integer('is_available', { mode: 'boolean' }),
  assigned_order_id: text('assigned_order_id'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const pos_config = sqliteTable('pos_config', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  branch_id: text('branch_id'),
  auto_print_kitchen: integer('auto_print_kitchen', { mode: 'boolean' }),
  auto_print_receipt: integer('auto_print_receipt', { mode: 'boolean' }),
  default_order_type: text('default_order_type'),
  webapp_enabled: integer('webapp_enabled', { mode: 'boolean' }),
  webapp_auto_accept: integer('webapp_auto_accept', { mode: 'boolean' }),
  show_item_cost: integer('show_item_cost', { mode: 'boolean' }),
  require_customer_for_delivery: integer('require_customer_for_delivery', { mode: 'boolean' }),
  default_area: text('default_area'),
  kitchen_display_mode: text('kitchen_display_mode'),
  pager_enabled: integer('pager_enabled', { mode: 'boolean' }),
  pager_total: integer('pager_total'),
  table_mode_enabled: integer('table_mode_enabled', { mode: 'boolean' }),
  table_count: integer('table_count'),
  auto_assign_pager: integer('auto_assign_pager', { mode: 'boolean' }),
  receipt_show_address: integer('receipt_show_address', { mode: 'boolean' }),
  receipt_show_phone: integer('receipt_show_phone', { mode: 'boolean' }),
  receipt_footer_text: text('receipt_footer_text'),
  receipt_header_text: text('receipt_header_text'),
  cash_register_enabled: integer('cash_register_enabled', { mode: 'boolean' }),
  show_delivery_map: integer('show_delivery_map', { mode: 'boolean' }),
  stock_enabled: integer('stock_enabled', { mode: 'boolean' }),
  allow_negative_stock: integer('allow_negative_stock', { mode: 'boolean' }),
  ticket_copies: integer('ticket_copies'),
  auto_print_webapp: integer('auto_print_webapp', { mode: 'boolean' }),
  receipt_show_order_type: integer('receipt_show_order_type', { mode: 'boolean' }),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const operator_session_logs = sqliteTable('operator_session_logs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  user_id: text('user_id'),
  branch_id: text('branch_id'),
  action: text('action'),
  verified_by: text('verified_by'),
  verified_method: text('verified_method'),
  metadata: text('metadata', { mode: 'json' }),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
});

// ============================================================================
// CASH REGISTERS
// ============================================================================

export const cash_registers = sqliteTable('cash_registers', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  branch_id: text('branch_id'),
  name: text('name'),
  is_active: integer('is_active', { mode: 'boolean' }),
  display_order: integer('display_order'),
  register_type: text('register_type'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const cash_register_shifts = sqliteTable('cash_register_shifts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  branch_id: text('branch_id'),
  cash_register_id: text('cash_register_id'),
  opened_by: text('opened_by'),
  opening_amount: real('opening_amount'),
  closed_by: text('closed_by'),
  closing_amount: real('closing_amount'),
  expected_amount: real('expected_amount'),
  difference: real('difference'),
  status: text('status'),
  notes: text('notes'),
  closing_report: text('closing_report', { mode: 'json' }),
  opened_at: text('opened_at'),
  closed_at: text('closed_at'),
  printed_at: text('printed_at'),
});

export const cash_register_movements = sqliteTable('cash_register_movements', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  branch_id: text('branch_id'),
  shift_id: text('shift_id'),
  type: text('type'),
  concept: text('concept'),
  amount: real('amount'),
  payment_method: text('payment_method'),
  expense_category: text('expense_category'),
  extra_notes: text('extra_notes'),
  recorded_by: text('recorded_by'),
  order_id: text('order_id'),
  source_register_id: text('source_register_id'),
  rdo_category_code: text('rdo_category_code'),
  approval_status: text('approval_status'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const cashier_discrepancy_history = sqliteTable('cashier_discrepancy_history', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  branch_id: text('branch_id'),
  user_id: text('user_id'),
  shift_id: text('shift_id'),
  cash_register_id: text('cash_register_id'),
  shift_date: text('shift_date'),
  expected_amount: real('expected_amount'),
  actual_amount: real('actual_amount'),
  discrepancy: real('discrepancy'),
  notes: text('notes'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const register_shifts_legacy = sqliteTable('register_shifts_legacy', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  branch_id: text('branch_id'),
  register_name: text('register_name'),
  opened_by: text('opened_by'),
  opening_amount: real('opening_amount'),
  closed_by: text('closed_by'),
  closing_amount: real('closing_amount'),
  expected_amount: real('expected_amount'),
  difference: real('difference'),
  status: text('status'),
  notes: text('notes'),
  opened_at: text('opened_at'),
  closed_at: text('closed_at'),
});

// ============================================================================
// PRINTING
// ============================================================================

export const print_config = sqliteTable('print_config', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  branch_id: text('branch_id'),
  trigger_type: text('trigger_type'),
  target_printer_id: text('target_printer_id'),
  is_active: integer('is_active', { mode: 'boolean' }),
  copies: integer('copies'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const print_jobs = sqliteTable('print_jobs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  branch_id: text('branch_id'),
  printer_id: text('printer_id'),
  job_type: text('job_type'),
  status: text('status'),
  content: text('content', { mode: 'json' }),
  order_id: text('order_id'),
  error_message: text('error_message'),
  retries: integer('retries'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
  printed_at: text('printed_at'),
});

// ============================================================================
// DELIVERY
// ============================================================================

export const delivery_drivers = sqliteTable('delivery_drivers', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  branch_id: text('branch_id'),
  name: text('name'),
  phone: text('phone'),
  user_id: text('user_id'),
  is_active: integer('is_active', { mode: 'boolean' }),
  is_available: integer('is_available', { mode: 'boolean' }),
  orders_today: integer('orders_today'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const delivery_pricing_config = sqliteTable('delivery_pricing_config', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  brand_id: text('brand_id'),
  base_price: real('base_price'),
  base_distance_km: real('base_distance_km'),
  price_per_extra_km: real('price_per_extra_km'),
  max_allowed_radius_km: real('max_allowed_radius_km'),
  prep_time_minutes: integer('prep_time_minutes'),
  estimated_speed_kmh: real('estimated_speed_kmh'),
  google_api_key_encrypted: text('google_api_key_encrypted'),
  time_disclaimer: text('time_disclaimer'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const delivery_radius_overrides_log = sqliteTable('delivery_radius_overrides_log', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  branch_id: text('branch_id'),
  action: text('action'),
  previous_km: real('previous_km'),
  new_km: real('new_km'),
  performed_by: text('performed_by'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const delivery_zones = sqliteTable('delivery_zones', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  branch_id: text('branch_id'),
  name: text('name'),
  description: text('description'),
  delivery_cost: real('delivery_cost'),
  pedido_minimo: real('pedido_minimo'),
  estimated_time_min: integer('estimated_time_min'),
  barrios: text('barrios', { mode: 'json' }),
  is_active: integer('is_active', { mode: 'boolean' }),
  sort_order: integer('sort_order'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const delivery_tracking = sqliteTable('delivery_tracking', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  order_id: text('order_id'),
  driver_id: text('driver_id'),
  latitude: real('latitude'),
  longitude: real('longitude'),
  status: text('status'),
  estimated_arrival: text('estimated_arrival'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const city_neighborhoods = sqliteTable('city_neighborhoods', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  city: text('city'),
  centroid_lat: real('centroid_lat'),
  centroid_lng: real('centroid_lng'),
  source: text('source'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
});

// ============================================================================
// PROMOTIONS & DISCOUNTS
// ============================================================================

export const promotions = sqliteTable('promotions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  description: text('description'),
  discount_type: text('discount_type'),
  discount_value: real('discount_value'),
  is_active: integer('is_active', { mode: 'boolean' }),
  start_date: text('start_date'),
  end_date: text('end_date'),
  branch_ids: text('branch_ids', { mode: 'json' }),
  min_order_amount: real('min_order_amount'),
  max_discount: real('max_discount'),
  applies_to: text('applies_to'),
  target_item_ids: text('target_item_ids', { mode: 'json' }),
  buy_quantity: integer('buy_quantity'),
  get_quantity: integer('get_quantity'),
  image_url: text('image_url'),
  channels: text('channels', { mode: 'json' }),
  created_by: text('created_by'),
  deleted_at: text('deleted_at'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const promotion_items = sqliteTable('promotion_items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  promotion_id: text('promotion_id'),
  menu_item_id: text('menu_item_id'),
  quantity: integer('quantity'),
  is_gift: integer('is_gift', { mode: 'boolean' }),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const promotion_item_extras = sqliteTable('promotion_item_extras', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  promotion_item_id: text('promotion_item_id'),
  extra_id: text('extra_id'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const discount_codes = sqliteTable('discount_codes', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  code: text('code'),
  type: text('type'),
  value: real('value'),
  brand_id: text('brand_id'),
  branch_ids: text('branch_ids', { mode: 'json' }),
  start_date: text('start_date'),
  end_date: text('end_date'),
  max_uses: integer('max_uses'),
  current_uses: integer('current_uses'),
  min_order_amount: real('min_order_amount'),
  single_use_per_user: integer('single_use_per_user', { mode: 'boolean' }),
  is_active: integer('is_active', { mode: 'boolean' }),
  created_by: text('created_by'),
  deleted_at: text('deleted_at'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const discount_code_uses = sqliteTable('discount_code_uses', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  code_id: text('code_id'),
  user_id: text('user_id'),
  pedido_id: text('pedido_id'),
  discount_amount: real('discount_amount'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
});

// ============================================================================
// EMPLOYEES & HR
// ============================================================================

export const employee_data = sqliteTable('employee_data', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  user_id: text('user_id'),
  branch_id: text('branch_id'),
  alias: text('alias'),
  dni: text('dni'),
  cuil: text('cuil'),
  birth_date: text('birth_date'),
  personal_address: text('personal_address'),
  emergency_contact: text('emergency_contact'),
  emergency_phone: text('emergency_phone'),
  hire_date: text('hire_date'),
  hourly_rate: real('hourly_rate'),
  monthly_hours_target: real('monthly_hours_target'),
  registered_hours: real('registered_hours'),
  bank_name: text('bank_name'),
  cbu: text('cbu'),
  internal_notes: text('internal_notes', { mode: 'json' }),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const employee_schedules = sqliteTable('employee_schedules', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  employee_id: text('employee_id'),
  user_id: text('user_id'),
  branch_id: text('branch_id'),
  schedule_date: text('schedule_date'),
  schedule_month: integer('schedule_month'),
  schedule_year: integer('schedule_year'),
  day_of_week: integer('day_of_week'),
  shift_number: integer('shift_number'),
  start_time: text('start_time'),
  end_time: text('end_time'),
  start_time_2: text('start_time_2'),
  end_time_2: text('end_time_2'),
  break_start: text('break_start'),
  break_end: text('break_end'),
  is_day_off: integer('is_day_off', { mode: 'boolean' }),
  work_position: text('work_position'),
  published_at: text('published_at'),
  published_by: text('published_by'),
  notification_sent_at: text('notification_sent_at'),
  modification_reason: text('modification_reason'),
  modified_at: text('modified_at'),
  modified_by: text('modified_by'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const employee_time_state = sqliteTable('employee_time_state', {
  employee_id: text('employee_id').primaryKey(),
  branch_id: text('branch_id'),
  current_state: text('current_state'),
  last_event_id: text('last_event_id'),
  open_clock_in_id: text('open_clock_in_id'),
  open_schedule_id: text('open_schedule_id'),
  last_updated: text('last_updated'),
});

export const employee_certifications = sqliteTable('employee_certifications', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  user_id: text('user_id'),
  branch_id: text('branch_id'),
  station_id: text('station_id'),
  level: integer('level'),
  notes: text('notes'),
  certified_by: text('certified_by'),
  certified_at: text('certified_at'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const employee_consumptions = sqliteTable('employee_consumptions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  user_id: text('user_id'),
  branch_id: text('branch_id'),
  amount: real('amount'),
  description: text('description'),
  consumption_date: text('consumption_date'),
  source: text('source'),
  created_by: text('created_by'),
  deleted_at: text('deleted_at'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const manual_consumptions = sqliteTable('manual_consumptions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  user_id: text('user_id'),
  branch_id: text('branch_id'),
  amount: real('amount'),
  description: text('description'),
  consumption_date: text('consumption_date'),
  created_by: text('created_by'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const salary_advances = sqliteTable('salary_advances', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  user_id: text('user_id'),
  branch_id: text('branch_id'),
  amount: real('amount'),
  advance_date: text('advance_date'),
  reason: text('reason'),
  status: text('status'),
  approved_by: text('approved_by'),
  approved_at: text('approved_at'),
  rejected_reason: text('rejected_reason'),
  payment_method: text('payment_method'),
  reference: text('reference'),
  notes: text('notes'),
  created_by: text('created_by'),
  deleted_at: text('deleted_at'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const staff_invitations = sqliteTable('staff_invitations', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email'),
  phone: text('phone'),
  full_name: text('full_name'),
  branch_id: text('branch_id'),
  role_key: text('role_key'),
  invited_by: text('invited_by'),
  token: text('token'),
  status: text('status'),
  expires_at: text('expires_at'),
  accepted_at: text('accepted_at'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const warnings = sqliteTable('warnings', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  user_id: text('user_id'),
  branch_id: text('branch_id'),
  warning_type: text('warning_type'),
  severity: text('severity'),
  description: text('description'),
  issued_by: text('issued_by'),
  issued_date: text('issued_date'),
  acknowledgement_date: text('acknowledgement_date'),
  acknowledgement_signature_url: text('acknowledgement_signature_url'),
  status: text('status'),
  notes: text('notes'),
  expiry_date: text('expiry_date'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const schedule_requests = sqliteTable('schedule_requests', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  employee_id: text('employee_id'),
  branch_id: text('branch_id'),
  request_type: text('request_type'),
  start_date: text('start_date'),
  end_date: text('end_date'),
  reason: text('reason'),
  status: text('status'),
  reviewed_by: text('reviewed_by'),
  reviewed_at: text('reviewed_at'),
  review_notes: text('review_notes'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

// ============================================================================
// CLOCK & LABOR
// ============================================================================

export const clock_entries = sqliteTable('clock_entries', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  user_id: text('user_id'),
  branch_id: text('branch_id'),
  entry_type: text('entry_type'),
  is_manual: integer('is_manual', { mode: 'boolean' }),
  manual_by: text('manual_by'),
  manual_reason: text('manual_reason'),
  latitude: real('latitude'),
  longitude: real('longitude'),
  gps_status: text('gps_status'),
  gps_message: text('gps_message'),
  photo_url: text('photo_url'),
  user_agent: text('user_agent'),
  ip_address: text('ip_address'),
  schedule_id: text('schedule_id'),
  work_date: text('work_date'),
  anomaly_type: text('anomaly_type'),
  resolved_type: text('resolved_type'),
  early_leave_authorized: integer('early_leave_authorized', { mode: 'boolean' }),
  original_created_at: text('original_created_at'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const labor_config = sqliteTable('labor_config', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  branch_id: text('branch_id'),
  overtime_threshold_daily: real('overtime_threshold_daily'),
  overtime_threshold_weekly: real('overtime_threshold_weekly'),
  overtime_multiplier: real('overtime_multiplier'),
  night_start: text('night_start'),
  night_end: text('night_end'),
  night_multiplier: real('night_multiplier'),
  holiday_multiplier: real('holiday_multiplier'),
  round_to_minutes: integer('round_to_minutes'),
  auto_deduct_break: integer('auto_deduct_break', { mode: 'boolean' }),
  break_deduct_minutes: integer('break_deduct_minutes'),
  tolerance_minutes: integer('tolerance_minutes'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const special_days = sqliteTable('special_days', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  date: text('date'),
  name: text('name'),
  type: text('type'),
  is_recurring: integer('is_recurring', { mode: 'boolean' }),
  applies_to_branches: text('applies_to_branches', { mode: 'json' }),
  created_by: text('created_by'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
});

// ============================================================================
// SHIFT CLOSURES & PERIODS
// ============================================================================

export const shift_closures = sqliteTable('shift_closures', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  branch_id: text('branch_id'),
  shift_id: text('shift_id'),
  closure_date: text('closure_date'),
  data: text('data', { mode: 'json' }),
  notes: text('notes'),
  closed_by: text('closed_by'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const periods = sqliteTable('periods', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  branch_id: text('branch_id'),
  period: text('period'),
  start_date: text('start_date'),
  end_date: text('end_date'),
  status: text('status'),
  closed_at: text('closed_at'),
  closed_by: text('closed_by'),
  notes: text('notes'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

// ============================================================================
// COACHING & COMPETENCIES
// ============================================================================

export const coachings = sqliteTable('coachings', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  user_id: text('user_id'),
  branch_id: text('branch_id'),
  evaluated_by: text('evaluated_by'),
  coaching_date: text('coaching_date'),
  coaching_month: integer('coaching_month'),
  coaching_year: integer('coaching_year'),
  coaching_type: text('coaching_type'),
  general_score: real('general_score'),
  station_score: real('station_score'),
  overall_score: real('overall_score'),
  strengths: text('strengths'),
  areas_to_improve: text('areas_to_improve'),
  action_plan: text('action_plan'),
  previous_action_review: text('previous_action_review'),
  manager_notes: text('manager_notes'),
  acknowledged_at: text('acknowledged_at'),
  acknowledged_notes: text('acknowledged_notes'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const coaching_competency_scores = sqliteTable('coaching_competency_scores', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  coaching_id: text('coaching_id'),
  competency_id: text('competency_id'),
  competency_type: text('competency_type'),
  score: integer('score'),
  notes: text('notes'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const coaching_station_scores = sqliteTable('coaching_station_scores', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  coaching_id: text('coaching_id'),
  station_id: text('station_id'),
  score: integer('score'),
  notes: text('notes'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const general_competencies = sqliteTable('general_competencies', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  description: text('description'),
  is_active: integer('is_active', { mode: 'boolean' }),
  sort_order: integer('sort_order'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const manager_competencies = sqliteTable('manager_competencies', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  description: text('description'),
  is_active: integer('is_active', { mode: 'boolean' }),
  sort_order: integer('sort_order'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const station_competencies = sqliteTable('station_competencies', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  station_id: text('station_id'),
  competency_id: text('competency_id'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const work_stations = sqliteTable('work_stations', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  description: text('description'),
  is_active: integer('is_active', { mode: 'boolean' }),
  sort_order: integer('sort_order'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const work_positions = sqliteTable('work_positions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  type: text('type'),
  branch_id: text('branch_id'),
  is_active: integer('is_active', { mode: 'boolean' }),
  sort_order: integer('sort_order'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
});

// ============================================================================
// INSPECTIONS
// ============================================================================

export const inspection_templates = sqliteTable('inspection_templates', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  description: text('description'),
  sections: text('sections', { mode: 'json' }),
  is_active: integer('is_active', { mode: 'boolean' }),
  created_by: text('created_by'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const inspection_items = sqliteTable('inspection_items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  inspection_id: text('inspection_id'),
  template_item_id: text('template_item_id'),
  section: text('section'),
  item_label: text('item_label'),
  score: integer('score'),
  max_score: integer('max_score'),
  is_critical: integer('is_critical', { mode: 'boolean' }),
  notes: text('notes'),
  photo_url: text('photo_url'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const inspection_staff_present = sqliteTable('inspection_staff_present', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  inspection_id: text('inspection_id'),
  user_id: text('user_id'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
});

// ============================================================================
// MEETINGS
// ============================================================================

export const meetings = sqliteTable('meetings', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  branch_id: text('branch_id'),
  title: text('title'),
  description: text('description'),
  meeting_date: text('meeting_date'),
  start_time: text('start_time'),
  end_time: text('end_time'),
  status: text('status'),
  location: text('location'),
  meeting_type: text('meeting_type'),
  created_by: text('created_by'),
  minutes: text('minutes'),
  closed_at: text('closed_at'),
  closed_by: text('closed_by'),
  notification_sent_at: text('notification_sent_at'),
  minutes_notification_sent_at: text('minutes_notification_sent_at'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const meeting_participants = sqliteTable('meeting_participants', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  meeting_id: text('meeting_id'),
  user_id: text('user_id'),
  attendance: text('attendance'),
  notes: text('notes'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const meeting_agreements = sqliteTable('meeting_agreements', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  meeting_id: text('meeting_id'),
  description: text('description'),
  responsible_id: text('responsible_id'),
  due_date: text('due_date'),
  status: text('status'),
  completed_at: text('completed_at'),
  completed_by: text('completed_by'),
  notes: text('notes'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const meeting_agreement_assignees = sqliteTable('meeting_agreement_assignees', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  agreement_id: text('agreement_id'),
  user_id: text('user_id'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
});

// ============================================================================
// COMMUNICATIONS
// ============================================================================

export const communications = sqliteTable('communications', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text('title'),
  body: text('body'),
  type: text('type'),
  tag: text('tag'),
  custom_label: text('custom_label'),
  source_type: text('source_type'),
  source_branch_id: text('source_branch_id'),
  created_by: text('created_by'),
  target_branch_ids: text('target_branch_ids', { mode: 'json' }),
  target_roles: text('target_roles', { mode: 'json' }),
  is_published: integer('is_published', { mode: 'boolean' }),
  published_at: text('published_at'),
  requires_confirmation: integer('requires_confirmation', { mode: 'boolean' }),
  expires_at: text('expires_at'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const communication_reads = sqliteTable('communication_reads', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  communication_id: text('communication_id'),
  user_id: text('user_id'),
  read_at: text('read_at'),
  confirmed_at: text('confirmed_at'),
});

export const push_subscriptions = sqliteTable('push_subscriptions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  user_id: text('user_id'),
  endpoint: text('endpoint'),
  keys: text('keys', { mode: 'json' }),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const whatsapp_templates = sqliteTable('whatsapp_templates', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  template_key: text('template_key'),
  template_text: text('template_text'),
  updated_by: text('updated_by'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

// ============================================================================
// REGULATIONS
// ============================================================================

export const regulations = sqliteTable('regulations', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text('title'),
  content: text('content'),
  file_url: text('file_url'),
  version: text('version'),
  is_active: integer('is_active', { mode: 'boolean' }),
  requires_signature: integer('requires_signature', { mode: 'boolean' }),
  scope: text('scope'),
  target_branch_ids: text('target_branch_ids', { mode: 'json' }),
  created_by: text('created_by'),
  published_at: text('published_at'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const regulation_signatures = sqliteTable('regulation_signatures', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  regulation_id: text('regulation_id'),
  user_id: text('user_id'),
  signature_url: text('signature_url'),
  signed_at: text('signed_at'),
  ip_address: text('ip_address'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
});

// ============================================================================
// CONTACT
// ============================================================================

export const contact_messages = sqliteTable('contact_messages', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email'),
  phone: text('phone'),
  subject: text('subject'),
  message: text('message'),
  status: text('status'),
  priority: text('priority'),
  read_at: text('read_at'),
  replied_at: text('replied_at'),
  replied_by: text('replied_by'),
  assigned_to: text('assigned_to'),
  notes: text('notes'),
  attachment_url: text('attachment_url'),
  attachment_name: text('attachment_name'),
  franchise_has_location: text('franchise_has_location'),
  franchise_has_zone: text('franchise_has_zone'),
  franchise_investment_capital: text('franchise_investment_capital'),
  investment_range: text('investment_range'),
  employment_position: text('employment_position'),
  employment_branch_id: text('employment_branch_id'),
  employment_cv_link: text('employment_cv_link'),
  employment_motivation: text('employment_motivation'),
  order_number: text('order_number'),
  order_date: text('order_date'),
  order_branch_id: text('order_branch_id'),
  order_issue: text('order_issue'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

// ============================================================================
// CUSTOMER & WEBAPP
// ============================================================================

export const customer_addresses = sqliteTable('customer_addresses', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  user_id: text('user_id'),
  label: text('label'),
  address: text('address'),
  city: text('city'),
  floor: text('floor'),
  reference: text('reference'),
  latitude: real('latitude'),
  longitude: real('longitude'),
  is_primary: integer('is_primary', { mode: 'boolean' }),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const webapp_config = sqliteTable('webapp_config', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  branch_id: text('branch_id'),
  is_active: integer('is_active', { mode: 'boolean' }),
  slug: text('slug'),
  hero_image_url: text('hero_image_url'),
  welcome_message: text('welcome_message'),
  min_order_amount: real('min_order_amount'),
  delivery_enabled: integer('delivery_enabled', { mode: 'boolean' }),
  takeaway_enabled: integer('takeaway_enabled', { mode: 'boolean' }),
  salon_enabled: integer('salon_enabled', { mode: 'boolean' }),
  estimated_delivery_time: integer('estimated_delivery_time'),
  estimated_takeaway_time: integer('estimated_takeaway_time'),
  payment_methods: text('payment_methods', { mode: 'json' }),
  custom_css: text('custom_css'),
  maintenance_message: text('maintenance_message'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const webapp_order_messages = sqliteTable('webapp_order_messages', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  order_id: text('order_id'),
  tracking_code: text('tracking_code'),
  sender_type: text('sender_type'),
  sender_name: text('sender_name'),
  message: text('message'),
  is_read: integer('is_read', { mode: 'boolean' }),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
});

// ============================================================================
// PAYMENTS & MERCADOPAGO
// ============================================================================

export const mercadopago_config = sqliteTable('mercadopago_config', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  branch_id: text('branch_id'),
  access_token_encrypted: text('access_token_encrypted'),
  public_key: text('public_key'),
  collector_id: text('collector_id'),
  external_pos_id: text('external_pos_id'),
  terminal_serial: text('terminal_serial'),
  operating_mode: text('operating_mode'),
  is_active: integer('is_active', { mode: 'boolean' }),
  last_tested_at: text('last_tested_at'),
  test_result: text('test_result'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

// ============================================================================
// CANON & FINANCIAL
// ============================================================================

export const canon_settlements = sqliteTable('canon_settlements', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  branch_id: text('branch_id'),
  period: text('period'),
  cash_total: real('cash_total'),
  online_total: real('online_total'),
  canon_percentage: real('canon_percentage'),
  canon_amount: real('canon_amount'),
  marketing_percentage: real('marketing_percentage'),
  marketing_amount: real('marketing_amount'),
  total_canon: real('total_canon'),
  cash_percentage: real('cash_percentage'),
  suggested_cash_payment: real('suggested_cash_payment'),
  suggested_transfer_payment: real('suggested_transfer_payment'),
  pending_balance: real('pending_balance'),
  status: text('status'),
  due_date: text('due_date'),
  notes: text('notes'),
  monthly_sales_id: text('monthly_sales_id'),
  created_by: text('created_by'),
  deleted_at: text('deleted_at'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const canon_payments = sqliteTable('canon_payments', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  branch_id: text('branch_id'),
  canon_settlement_id: text('canon_settlement_id'),
  payment_date: text('payment_date'),
  amount: real('amount'),
  payment_method: text('payment_method'),
  reference: text('reference'),
  notes: text('notes'),
  payment_data: text('payment_data', { mode: 'json' }),
  is_verified: integer('is_verified', { mode: 'boolean' }),
  verified_by: text('verified_by'),
  verified_at: text('verified_at'),
  verified_notes: text('verified_notes'),
  created_by: text('created_by'),
  deleted_at: text('deleted_at'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const expenses = sqliteTable('expenses', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  branch_id: text('branch_id'),
  concept: text('concept'),
  amount: real('amount'),
  payment_method: text('payment_method'),
  expense_category: text('expense_category'),
  affects_register: integer('affects_register', { mode: 'boolean' }),
  notes: text('notes'),
  attachments: text('attachments', { mode: 'json' }),
  rdo_category_code: text('rdo_category_code'),
  expense_date: text('expense_date'),
  created_by: text('created_by'),
  approved_by: text('approved_by'),
  approval_status: text('approval_status'),
  deleted_at: text('deleted_at'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const investments = sqliteTable('investments', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  branch_id: text('branch_id'),
  concept: text('concept'),
  amount: real('amount'),
  investment_date: text('investment_date'),
  notes: text('notes'),
  created_by: text('created_by'),
  deleted_at: text('deleted_at'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const partners = sqliteTable('partners', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  document_number: text('document_number'),
  ownership_percentage: real('ownership_percentage'),
  investment_amount: real('investment_amount'),
  join_date: text('join_date'),
  phone: text('phone'),
  email: text('email'),
  is_active: integer('is_active', { mode: 'boolean' }),
  notes: text('notes'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const partner_movements = sqliteTable('partner_movements', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  partner_id: text('partner_id'),
  type: text('type'),
  amount: real('amount'),
  description: text('description'),
  reference_date: text('reference_date'),
  created_by: text('created_by'),
  deleted_at: text('deleted_at'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const profit_distributions = sqliteTable('profit_distributions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  period: text('period'),
  total_profit: real('total_profit'),
  distribution_date: text('distribution_date'),
  notes: text('notes'),
  created_by: text('created_by'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
});

// ============================================================================
// RDO (RESULTADO DIARIO OPERATIVO)
// ============================================================================

export const rdo_categories = sqliteTable('rdo_categories', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  code: text('code'),
  label: text('label'),
  type: text('type'),
  parent_code: text('parent_code'),
  sort_order: integer('sort_order'),
  is_active: integer('is_active', { mode: 'boolean' }),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const rdo_movements = sqliteTable('rdo_movements', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  branch_id: text('branch_id'),
  period: text('period'),
  category_code: text('category_code'),
  amount: real('amount'),
  notes: text('notes'),
  source: text('source'),
  created_by: text('created_by'),
  deleted_at: text('deleted_at'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const service_concepts = sqliteTable('service_concepts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  code: text('code'),
  label: text('label'),
  type: text('type'),
  sort_order: integer('sort_order'),
  is_active: integer('is_active', { mode: 'boolean' }),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
});

// ============================================================================
// SUPPLIERS
// ============================================================================

export const suppliers = sqliteTable('suppliers', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  cuit: text('cuit'),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  category: text('category'),
  payment_terms: text('payment_terms'),
  notes: text('notes'),
  is_active: integer('is_active', { mode: 'boolean' }),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const supplier_branch_terms = sqliteTable('supplier_branch_terms', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  supplier_id: text('supplier_id'),
  branch_id: text('branch_id'),
  delivery_days: text('delivery_days', { mode: 'json' }),
  payment_terms: text('payment_terms'),
  notes: text('notes'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const supplier_invoices = sqliteTable('supplier_invoices', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  supplier_id: text('supplier_id'),
  branch_id: text('branch_id'),
  invoice_number: text('invoice_number'),
  invoice_date: text('invoice_date'),
  due_date: text('due_date'),
  subtotal: real('subtotal'),
  tax_amount: real('tax_amount'),
  total_amount: real('total_amount'),
  status: text('status'),
  notes: text('notes'),
  period: text('period'),
  created_by: text('created_by'),
  deleted_at: text('deleted_at'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const supplier_payments = sqliteTable('supplier_payments', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  supplier_id: text('supplier_id'),
  branch_id: text('branch_id'),
  amount: real('amount'),
  payment_date: text('payment_date'),
  payment_method: text('payment_method'),
  reference: text('reference'),
  notes: text('notes'),
  invoice_id: text('invoice_id'),
  created_by: text('created_by'),
  deleted_at: text('deleted_at'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
});
