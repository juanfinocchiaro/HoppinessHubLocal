

## Diagnóstico: Errores en el saldo acumulado de Cuenta Corriente

### Problemas encontrados

**1. Doble conteo de imputaciones de saldo a favor**

Cuando se sobrepaga una factura (ej: CANON-2025-12 se pagó $2,656,290.62 sobre $2,648,797.83), el saldo acumulado ya refleja ese sobrante como balance negativo (-$7,492.79). Luego, al registrar la "imputación" como un pago de $7,492.79 contra la siguiente factura, se resta DOS veces del saldo acumulado.

```text
Ejemplo actual (incorrecto):
  CANON-2025-12      +2,648,797.83  → saldo 2,648,797.83
  Pago transferencia  -1,256,290.62  → saldo 1,392,507.21
  Pago efectivo       -1,400,000.00  → saldo -7,492.79    ← overpayment ya reflejado
  CANON-2026-01      +2,389,815.66  → saldo 2,382,322.87
  Imputación          -7,492.79      → saldo 2,374,830.08  ← DOBLE CONTEO

Correcto:
  ...mismos pasos...
  CANON-2026-01      +2,389,815.66  → saldo 2,382,322.87  ← imputación no afecta running balance
```

**2. CANON-2026-01 marcada como "pagado" incorrectamente**

La factura de enero 2026 tiene `pending_balance = 0` y `status = pagado`, pero solo tiene $7,492.79 en pagos reales (la imputación). Falta aplicar el pago a cuenta de $2,500,000.

```text
Datos en DB:
  CANON-2026-01: total=2,389,815.66, total_paid=7,492.79, pending=0, status=pagado ← MAL
  Pago a cuenta: $2,500,000 con invoice_id=NULL (no aplicado)
```

**3. Efecto cascada: saldo final inflado**

El saldo final muestra $4,873,409.94 cuando debería ser ~$4,998,579.86 (facturas pendientes reales) menos $2,500,000 (pago a cuenta) = ~$2,498,579.86.

### Plan de corrección

**A. Fix en código: excluir imputaciones del running balance** (1 archivo)

En `src/hooks/useCuentaCorrienteProveedor.ts`:
- Las imputaciones (`payment_method = 'imputacion_saldo'`) se siguen mostrando como filas en la tabla (para trazabilidad)
- Pero NO se restan del saldo acumulado, ya que el efecto del sobrepago ya está reflejado en el balance

**B. Fix de datos: corregir CANON-2026-01** (migración SQL)

- Recalcular `pending_balance` de CANON-2026-01 basándose en pagos reales vinculados (excluyendo imputaciones internas, o contándolas correctamente)
- Actualizar `payment_status` según el balance real
- Verificar que el pago a cuenta de $2.5M esté correctamente reflejado (decidir si vincularlo o dejarlo como pago a cuenta)

**C. Fix en trigger `generate_canon_invoice`** (migración SQL)

- Al recalcular pending_balance, excluir pagos con `payment_method = 'imputacion_saldo'` del cálculo, ya que representan transferencias internas, no pagos reales — O alternativamente, contarlos pero asegurarse de que el sobrepago de la factura fuente también se ajuste

### Resultado esperado

- El saldo acumulado reflejará correctamente las entradas y salidas de dinero real
- Las imputaciones se mostrarán como información pero no distorsionarán el balance
- Las facturas tendrán pending_balance y status consistentes con los pagos reales

