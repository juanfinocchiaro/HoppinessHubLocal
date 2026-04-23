import { describe, it, expect } from 'vitest';
import { evaluateInvoicing } from './invoicing-rules';
import type { ReglasFacturacion } from '@/types/shiftClosure';

const defaultReglas: ReglasFacturacion = {
  canales_internos: {
    efectivo: false,
    debito: true,
    credito: true,
    qr: true,
    transferencia: true,
  },
  canales_externos: {
    rappi: true,
    pedidosya: true,
    mas_delivery_efectivo: false,
    mas_delivery_digital: true,
    mp_delivery: true,
  },
};

describe('evaluateInvoicing', () => {
  describe('with null/undefined rules', () => {
    it('returns shouldInvoice=false when reglas is null', () => {
      const result = evaluateInvoicing(
        [{ method: 'cash', amount: 1000 }],
        'mostrador',
        null,
      );
      expect(result.shouldInvoice).toBe(false);
      expect(result.invoiceableAmount).toBe(0);
      expect(result.totalAmount).toBe(1000);
    });

    it('returns shouldInvoice=false when reglas is undefined', () => {
      const result = evaluateInvoicing(
        [{ method: 'debit_card', amount: 500 }],
        'mostrador',
        undefined,
      );
      expect(result.shouldInvoice).toBe(false);
    });
  });

  describe('internal channels (mostrador)', () => {
    it('does not invoice cash when efectivo rule is false', () => {
      const result = evaluateInvoicing(
        [{ method: 'cash', amount: 1000 }],
        'mostrador',
        defaultReglas,
      );
      expect(result.shouldInvoice).toBe(false);
      expect(result.invoiceableAmount).toBe(0);
    });

    it('invoices debit card when debito rule is true', () => {
      const result = evaluateInvoicing(
        [{ method: 'debit_card', amount: 2000 }],
        'mostrador',
        defaultReglas,
      );
      expect(result.shouldInvoice).toBe(true);
      expect(result.invoiceableAmount).toBe(2000);
    });

    it('invoices credit card when credito rule is true', () => {
      const result = evaluateInvoicing(
        [{ method: 'credit_card', amount: 3000 }],
        'mostrador',
        defaultReglas,
      );
      expect(result.shouldInvoice).toBe(true);
      expect(result.invoiceableAmount).toBe(3000);
    });

    it('invoices QR/MercadoPago when qr rule is true', () => {
      const result = evaluateInvoicing(
        [{ method: 'mercadopago_qr', amount: 1500 }],
        'mostrador',
        defaultReglas,
      );
      expect(result.shouldInvoice).toBe(true);
      expect(result.invoiceableAmount).toBe(1500);
    });

    it('handles mixed payments correctly (partial invoicing)', () => {
      const result = evaluateInvoicing(
        [
          { method: 'cash', amount: 1000 },
          { method: 'debit_card', amount: 2000 },
        ],
        'mostrador',
        defaultReglas,
      );
      expect(result.shouldInvoice).toBe(true);
      expect(result.invoiceableAmount).toBe(2000);
      expect(result.totalAmount).toBe(3000);
    });

    it('works the same for delivery channel', () => {
      const result = evaluateInvoicing(
        [{ method: 'credit_card', amount: 5000 }],
        'delivery',
        defaultReglas,
      );
      expect(result.shouldInvoice).toBe(true);
      expect(result.invoiceableAmount).toBe(5000);
    });

    it('invoices all when efectivo is enabled', () => {
      const allEnabled: ReglasFacturacion = {
        ...defaultReglas,
        canales_internos: {
          efectivo: true,
          debito: true,
          credito: true,
          qr: true,
          transferencia: true,
        },
      };
      const result = evaluateInvoicing(
        [
          { method: 'cash', amount: 1000 },
          { method: 'debit_card', amount: 2000 },
        ],
        'mostrador',
        allEnabled,
      );
      expect(result.invoiceableAmount).toBe(3000);
    });
  });

  describe('external channels', () => {
    it('invoices rappi orders when rappi rule is true', () => {
      const result = evaluateInvoicing(
        [{ method: 'vouchers', amount: 4000 }],
        'rappi',
        defaultReglas,
      );
      expect(result.shouldInvoice).toBe(true);
      expect(result.invoiceableAmount).toBe(4000);
    });

    it('does not invoice rappi when rule is false', () => {
      const noRappi: ReglasFacturacion = {
        ...defaultReglas,
        canales_externos: { ...defaultReglas.canales_externos, rappi: false },
      };
      const result = evaluateInvoicing([{ method: 'vouchers', amount: 4000 }], 'rappi', noRappi);
      expect(result.shouldInvoice).toBe(false);
      expect(result.invoiceableAmount).toBe(0);
    });

    it('invoices pedidosya orders when rule is true', () => {
      const result = evaluateInvoicing(
        [{ method: 'vouchers', amount: 3000 }],
        'pedidosya',
        defaultReglas,
      );
      expect(result.shouldInvoice).toBe(true);
      expect(result.invoiceableAmount).toBe(3000);
    });

    it('invoices mp_delivery when rule is true', () => {
      const result = evaluateInvoicing(
        [{ method: 'mercadopago', amount: 2500 }],
        'mp_delivery',
        defaultReglas,
      );
      expect(result.shouldInvoice).toBe(true);
      expect(result.invoiceableAmount).toBe(2500);
    });

    it('handles mas_delivery split rules (cash not invoiced, digital invoiced)', () => {
      const result = evaluateInvoicing(
        [
          { method: 'cash', amount: 1000 },
          { method: 'debit_card', amount: 2000 },
        ],
        'mas_delivery',
        defaultReglas,
      );
      expect(result.shouldInvoice).toBe(true);
      expect(result.invoiceableAmount).toBe(2000);
      expect(result.totalAmount).toBe(3000);
    });

    it('handles mas_delivery all-cash (not invoiced when efectivo rule is false)', () => {
      const result = evaluateInvoicing(
        [{ method: 'cash', amount: 3000 }],
        'mas_delivery',
        defaultReglas,
      );
      expect(result.shouldInvoice).toBe(false);
      expect(result.invoiceableAmount).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('handles empty payments array', () => {
      const result = evaluateInvoicing([], 'mostrador', defaultReglas);
      expect(result.shouldInvoice).toBe(false);
      expect(result.invoiceableAmount).toBe(0);
      expect(result.totalAmount).toBe(0);
    });

    it('handles vales payment method (no rule key)', () => {
      const result = evaluateInvoicing(
        [{ method: 'vouchers', amount: 500 }],
        'mostrador',
        defaultReglas,
      );
      expect(result.shouldInvoice).toBe(false);
      expect(result.invoiceableAmount).toBe(0);
    });
  });
});
