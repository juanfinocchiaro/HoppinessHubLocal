import React from 'react';
import { ProductSection, type ProductSectionProps } from './ProductSection';

const SECTIONS: ProductSectionProps[] = [
  {
    kicker: '01 · CATÁLOGO',
    headline: 'Un solo catálogo. Todos tus canales.',
    body: 'Cargás un producto una vez. Se publica en mostrador, WebApp, Rappi, PedidosYa y MercadoPago Delivery. Cambiás el precio en un lugar. Cambia en todos.',
    bullets: [
      'Sincronización nativa con Rappi, PedidosYa y MercadoPago',
      'Overrides de precio por canal sin duplicar productos',
      'Modifiers compartidos en toda la operación',
      'Visibilidad granular: qué se vende en cada canal',
    ],
    direction: 'left',
    background: 'papel',
  },
  {
    kicker: '02 · COSTEO',
    headline: 'El costo real de cada plato.',
    body: 'Cargás tus insumos. Armás recetas. RestoStack calcula el costo real de cada producto, cada combo, cada canal. En tiempo real, cuando cambia cualquier precio.',
    bullets: [
      'Cost rollup automático desde insumo hasta combo',
      'Margen por producto y por canal',
      'Simulador de precios antes de publicar',
      'Alertas cuando el margen cae del umbral configurado',
    ],
    direction: 'right',
    background: 'crema',
  },
  {
    kicker: '03 · OPERACIÓN',
    headline: 'Tu operación, medida.',
    body: 'Ventas del turno. Costo de mercadería vendida. Propinas. Productividad por cajero. Todo lo que necesitás para cerrar la noche sabiendo qué pasó. No al día siguiente.',
    bullets: [
      'Reporting en vivo del turno actual',
      'Cierre de caja digital con cuadre automático',
      'Métricas de venta separadas por canal',
      'Exports para contaduría y ARCA/AFIP',
    ],
    direction: 'left',
    background: 'papel',
  },
  {
    kicker: '04 · ESCALA',
    headline: 'De un local a cincuenta. Mismo stack.',
    body: 'Empezás con un local. Abrís el segundo. Abrís el décimo. RestoStack no cambia. Cambia la vista: ahora tenés dashboard consolidado, catálogo compartido, permisos por location. Sin migrar. Sin rehacer.',
    bullets: [
      'Multi-location nativo desde el core',
      'Permisos scope × capability por usuario',
      'Dashboard consolidado de todos los locales',
      'Catálogo compartido con overrides por location',
    ],
    direction: 'right',
    background: 'crema',
  },
];

export function ProductSections() {
  return (
    <>
      {SECTIONS.map((section) => (
        <ProductSection key={section.kicker} {...section} />
      ))}
    </>
  );
}
