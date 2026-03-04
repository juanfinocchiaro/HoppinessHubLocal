import type { EI, CG, ItemCartaRow } from './types';
import { IVA } from '@/lib/constants';

export { IVA };

export const fmt = (v: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(v);

export const fmtPct = (v: number) => `${v.toFixed(1)}%`;
export const neto = (p: number) => p / IVA;
export const calcFC = (costo: number, precio: number) =>
  precio > 0 ? (costo / neto(precio)) * 100 : 0;
export const calcMargen = (costo: number, precio: number) => neto(precio) - costo;
export const calcSugerido = (costo: number, fcObj: number) =>
  fcObj > 0 ? (costo / (fcObj / 100)) * IVA : 0;

export function fcColor(real: number, obj: number): 'ok' | 'warn' | 'danger' {
  const d = real - obj;
  return d <= 2 ? 'ok' : d <= 8 ? 'warn' : 'danger';
}

export const badgeVar = {
  ok: 'default' as const,
  warn: 'secondary' as const,
  danger: 'destructive' as const,
};

export const txtColor = {
  ok: 'text-green-600',
  warn: 'text-yellow-600',
  danger: 'text-red-600',
};

export function enrich(items: ItemCartaRow[]): EI[] {
  return items.map((it) => {
    const c = Number(it.costo_total) || 0,
      p = Number(it.precio_base) || 0;
    const obj = Number(it.fc_objetivo) || 32;
    const n = neto(p),
      fc = p > 0 ? calcFC(c, p) : 0;
    return {
      id: it.id,
      nombre: it.nombre,
      cat: it.menu_categorias?.nombre || 'Sin categoría',
      catId: it.categoria_carta_id || '_none',
      costo: c,
      precio: p,
      pNeto: n,
      fc,
      fcObj: obj,
      margen: p > 0 ? calcMargen(c, p) : 0,
      pSug: c > 0 ? calcSugerido(c, obj) : 0,
      color: p > 0 && c > 0 ? fcColor(fc, obj) : 'warn',
      hasComp: c > 0 || !!it.composicion_ref_preparacion_id || !!it.composicion_ref_insumo_id,
      hasPrice: p > 0,
      raw: it,
    };
  });
}

export function groupByCat(items: EI[], categorias?: any[]): CG[] {
  const m = new Map<string, EI[]>();
  items.forEach((i) => {
    if (!m.has(i.catId)) m.set(i.catId, []);
    m.get(i.catId)!.push(i);
  });
  const catMap = new Map<string, any>();
  (categorias || []).forEach((c: any) => catMap.set(c.id, c));
  return Array.from(m.entries())
    .map(([id, ci]) => {
      const w = ci.filter((i) => i.hasComp && i.hasPrice);
      const n = w.length || 1;
      const cmv = w.reduce((s, i) => s + i.fc, 0) / n;
      const obj = w.reduce((s, i) => s + i.fcObj, 0) / n;
      const mg = w.reduce((s, i) => s + i.margen, 0) / n;
      const cat = catMap.get(id);
      return {
        nombre: ci[0]?.cat,
        id,
        items: ci,
        cmv,
        obj,
        margen: mg,
        color: fcColor(cmv, obj),
        hidden: cat?.visible_en_carta === false,
        orden: cat?.orden ?? 999,
      };
    })
    .sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999));
}
