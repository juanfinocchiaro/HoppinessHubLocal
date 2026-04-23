import type { PromocionFormData } from '@/hooks/usePromociones';

export interface PromoItemExtraDraft {
  extra_item_carta_id: string;
  name: string;
  quantity: number;
  precio_extra: number;
}

export interface PromoItemDraft {
  item_carta_id: string;
  name: string;
  image_url?: string | null;
  base_price: number;
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
