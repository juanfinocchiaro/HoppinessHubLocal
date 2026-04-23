import type { DaySchedule, WebappPaymentMethods, ServiceScheduleV2 } from './webappConfigTypes';
import { DAYS } from './webappConfigTypes';

export const defaultDays = (): Record<string, DaySchedule> =>
  Object.fromEntries(DAYS.map((d) => [d, { enabled: true, from: '11:00', to: '23:00' }]));

export const defaultPaymentMethods = (serviceKey: string): WebappPaymentMethods => {
  if (serviceKey === 'delivery') return { efectivo: false, mercadopago: true };
  return { efectivo: true, mercadopago: true };
};

export const defaultService = (serviceKey: string, prepTime: number): ServiceScheduleV2 => ({
  enabled: false,
  prep_time: prepTime,
  days: defaultDays(),
  payment_methods: defaultPaymentMethods(serviceKey),
});

/** Migrate old flat format to new v2 format */
export function migrateSchedules(
  raw: any,
  form: { retiro_habilitado: boolean; delivery_habilitado: boolean; comer_aca_habilitado: boolean },
  config: any,
): Record<string, ServiceScheduleV2> {
  const result: Record<string, ServiceScheduleV2> = {
    retiro: defaultService('retiro', config?.prep_time_retiro ?? 15),
    delivery: {
      ...defaultService('delivery', config?.prep_time_delivery ?? 40),
      radio_km: config?.delivery_radio_km ?? 5,
      costo: config?.delivery_costo ?? 0,
      pedido_minimo: config?.delivery_pedido_minimo ?? 0,
    },
    comer_aca: defaultService('comer_aca', config?.prep_time_comer_aca ?? 15),
  };

  if (raw?.retiro?.days || raw?.delivery?.days || raw?.comer_aca?.days) {
    for (const key of ['retiro', 'delivery', 'comer_aca']) {
      if (raw[key]) {
        result[key] = {
          ...result[key],
          ...raw[key],
          payment_methods: { ...defaultPaymentMethods(key), ...(raw[key].payment_methods || {}) },
          days: { ...result[key].days, ...(raw[key].days || {}) },
        };
      }
    }
  } else if (raw) {
    for (const key of ['retiro', 'delivery', 'comer_aca']) {
      if (raw[key]) {
        const old = raw[key];
        result[key].enabled = old.enabled ?? false;
        if (old.from && old.to) {
          for (const d of DAYS) {
            result[key].days[d] = { enabled: true, from: old.from, to: old.to };
          }
        }
      }
    }
  }

  result.retiro.enabled = form.retiro_habilitado;
  result.delivery.enabled = form.delivery_habilitado;
  result.comer_aca.enabled = form.comer_aca_habilitado;

  return result;
}
