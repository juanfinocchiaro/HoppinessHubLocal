

## Fix: All FK constraints blocking DELETE on supplier_invoices

**Problem**: Deleting a `supplier_invoice` row fails because two foreign key constraints have no `ON DELETE` rule, causing PostgreSQL to block the operation.

**Constraints to fix**:

| Table | Constraint | Current | New Rule |
|-------|-----------|---------|----------|
| `stock_movements` | `stock_movimientos_factura_proveedor_id_fkey` | NO ACTION | `ON DELETE SET NULL` |
| `supplier_payments` | `pagos_proveedores_factura_id_fkey` | NO ACTION | `ON DELETE CASCADE` |

**Rationale**:
- `stock_movements`: SET NULL preserves movement history while unlinking from deleted invoice
- `supplier_payments`: CASCADE deletes associated payments when the invoice is removed (canon invoices are auto-generated, so their payments should go too)

**Already OK** (no changes needed):
- `invoice_items` → CASCADE ✅
- `invoice_payment_links` → CASCADE ✅  
- `supply_cost_history` → SET NULL ✅

**Change**: Single database migration dropping and recreating the two constraints.

