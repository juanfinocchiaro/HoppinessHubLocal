import type { PromocionFormData } from '@/hooks/usePromociones';

export interface PromoItemExtraDraft {
  extra_item_carta_id: string;
  nombre: string;
  cantidad: number;
  precio_extra: number;
}

export interface PromoItemDraft {
  item_carta_id: string;
  nombre: string;
  imagen_url?: string | null;
  precio_base: number;
  precio_promo: number;
  preconfigExtras?: PromoItemExtraDraft[];
}

export interface PromoEditDraft {
  form: PromocionFormData;
  promoItems: PromoItemDraft[];
  itemSearch: string;
  initialSignature: string;
  loading: boolean;
}
