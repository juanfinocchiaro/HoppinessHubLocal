
-- ============================================================
-- PHASE 3: Rename all remaining Spanish tables to English
-- ============================================================

-- Gastos module
ALTER TABLE IF EXISTS gastos RENAME TO expenses;

-- Proveedores module
ALTER TABLE IF EXISTS proveedores RENAME TO suppliers;
ALTER TABLE IF EXISTS facturas_proveedores RENAME TO supplier_invoices;
ALTER TABLE IF EXISTS pagos_proveedores RENAME TO supplier_payments;
ALTER TABLE IF EXISTS items_factura RENAME TO invoice_items;
ALTER TABLE IF EXISTS pago_factura RENAME TO invoice_payment_links;
ALTER TABLE IF EXISTS proveedor_condiciones_local RENAME TO supplier_branch_terms;

-- Menu module
ALTER TABLE IF EXISTS items_carta RENAME TO menu_items;
ALTER TABLE IF EXISTS menu_categorias RENAME TO menu_categories;
ALTER TABLE IF EXISTS item_carta_composicion RENAME TO menu_item_compositions;
ALTER TABLE IF EXISTS item_carta_extras RENAME TO menu_item_extras;
ALTER TABLE IF EXISTS item_carta_grupo_opcional RENAME TO menu_item_option_groups;
ALTER TABLE IF EXISTS item_carta_grupo_opcional_items RENAME TO menu_item_option_group_items;
ALTER TABLE IF EXISTS item_carta_precios_historial RENAME TO menu_item_price_history;
ALTER TABLE IF EXISTS item_extra_asignaciones RENAME TO extra_assignments;
ALTER TABLE IF EXISTS item_modificadores RENAME TO item_modifiers;
ALTER TABLE IF EXISTS item_removibles RENAME TO removable_items;

-- Orders module
ALTER TABLE IF EXISTS pedidos RENAME TO orders;
ALTER TABLE IF EXISTS pedido_items RENAME TO order_items;
ALTER TABLE IF EXISTS pedido_pagos RENAME TO order_payments;
ALTER TABLE IF EXISTS pedido_item_modificadores RENAME TO order_item_modifiers;
ALTER TABLE IF EXISTS pedido_payment_edits RENAME TO order_payment_edits;

-- Recipes & Supplies module
ALTER TABLE IF EXISTS preparaciones RENAME TO recipes;
ALTER TABLE IF EXISTS preparacion_ingredientes RENAME TO recipe_ingredients;
ALTER TABLE IF EXISTS preparacion_opciones RENAME TO recipe_options;
ALTER TABLE IF EXISTS insumos RENAME TO supplies;
ALTER TABLE IF EXISTS categorias_insumo RENAME TO supply_categories;
ALTER TABLE IF EXISTS categorias_preparacion RENAME TO recipe_categories;

-- Promos module
ALTER TABLE IF EXISTS promociones RENAME TO promotions;
ALTER TABLE IF EXISTS promocion_items RENAME TO promotion_items;
ALTER TABLE IF EXISTS promocion_item_extras RENAME TO promotion_item_extras;
ALTER TABLE IF EXISTS codigos_descuento RENAME TO discount_codes;
ALTER TABLE IF EXISTS codigos_descuento_usos RENAME TO discount_code_uses;

-- Financial module
ALTER TABLE IF EXISTS conceptos_servicio RENAME TO service_concepts;
ALTER TABLE IF EXISTS configuracion_impuestos RENAME TO tax_config;
ALTER TABLE IF EXISTS consumos_manuales RENAME TO manual_consumptions;
ALTER TABLE IF EXISTS facturas_emitidas RENAME TO issued_invoices;
ALTER TABLE IF EXISTS inversiones RENAME TO investments;
ALTER TABLE IF EXISTS canon_liquidaciones RENAME TO canon_settlements;
ALTER TABLE IF EXISTS pagos_canon RENAME TO canon_payments;
ALTER TABLE IF EXISTS ventas_mensuales_local RENAME TO branch_monthly_sales;

-- Misc
ALTER TABLE IF EXISTS webapp_pedido_mensajes RENAME TO webapp_order_messages;
ALTER TABLE IF EXISTS turnos_caja RENAME TO register_shifts_legacy;
