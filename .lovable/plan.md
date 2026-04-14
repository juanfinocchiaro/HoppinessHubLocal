

## Fix: Pagos a cuenta no se imputan a facturas pendientes

### Problema actual

Cuando se registra un "Pago a Cuenta" (sin vincular a factura), el dinero queda como pago flotante (`invoice_id = NULL`). Las facturas siguen mostrando su `pending_balance` completo y aparecen como "vencidas", aunque hay fondos suficientes para cubrirlas.

Datos actuales en Manantiales:
- CANON-2026-01-MNT: $2,389,815.66 pendiente (vencida)
- Pago a cuenta: $2,500,000 sin vincular

### Plan de corrección

**A. Migración SQL: vincular pagos flotantes existentes** (1 migración)

Tomar los 5 pagos huérfanos (`invoice_id IS NULL`) y aplicarlos a las facturas pendientes más antiguas de cada sucursal, usando lógica FIFO:
- Para cada pago sin factura, buscar facturas pendientes de la misma sucursal/proveedor ordenadas por `due_date`
- Crear registros en `invoice_payment_links` y actualizar `pending_balance` / `payment_status` de cada factura
- Si el pago excede la factura, pasar el remanente a la siguiente

**B. Código: auto-imputar pagos a cuenta al registrarlos** (1 archivo)

Modificar `createPagoProveedor` en `src/services/financialService.ts`:
- Cuando no hay `aplicaciones` (pago a cuenta), buscar automáticamente facturas pendientes de ese proveedor+sucursal ordenadas por `due_date` ASC
- Aplicar el monto FIFO: ir cubriendo facturas desde la más vieja hasta agotar el pago
- Crear los `invoice_payment_links` correspondientes
- Actualizar `pending_balance` y `payment_status` de cada factura tocada
- Si queda remanente, el pago queda parcialmente sin vincular (saldo a favor real)

**C. Lógica de status automático** (ya incluido en B)

Cuando `pending_balance` llega a 0 → `payment_status = 'pagado'`
Cuando baja pero no llega a 0 → `payment_status = 'parcial'`

### Resultado esperado

- Al registrar un pago a cuenta, se aplica automáticamente a facturas vencidas/pendientes (FIFO)
- Las facturas pasan a "pagado" cuando su saldo llega a 0
- Los $2.5M existentes se vincularán a CANON-2026-01-MNT, dejándola pagada con ~$110K de saldo a favor

