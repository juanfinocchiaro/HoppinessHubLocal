import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { CartItem, TipoServicioWebapp } from '@/types/webapp';

const CART_STORAGE_KEY = 'hoppiness_cart';
const CART_EXPIRY_MS = 2 * 60 * 60 * 1000; // 2 hours

interface PersistedCart {
  items: CartItem[];
  tipoServicio: TipoServicioWebapp;
  timestamp: number;
}

function loadCart(): { items: CartItem[]; tipoServicio: TipoServicioWebapp } {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return { items: [], tipoServicio: 'retiro' };
    const parsed: PersistedCart = JSON.parse(raw);
    if (Date.now() - parsed.timestamp > CART_EXPIRY_MS) {
      localStorage.removeItem(CART_STORAGE_KEY);
      return { items: [], tipoServicio: 'retiro' };
    }
    const tipo = parsed.tipoServicio === 'delivery' ? 'delivery' : 'retiro';
    return { items: parsed.items || [], tipoServicio: tipo };
  } catch {
    return { items: [], tipoServicio: 'retiro' };
  }
}

export function useWebappCart() {
  const initial = useRef(loadCart());
  const [items, setItems] = useState<CartItem[]>(initial.current.items);
  const [tipoServicio, setTipoServicio] = useState<TipoServicioWebapp>(
    initial.current.tipoServicio,
  );

  /** Load reorder items from localStorage (set by MisPedidosSheet) */
  const loadReorderItems = useCallback(
    (
      menuItems: Array<{
        id: string;
        name: string;
        base_price: number;
        image_url: string | null;
      }>,
    ) => {
      try {
        const raw = localStorage.getItem('hoppiness_reorder');
        if (!raw) return false;
        localStorage.removeItem('hoppiness_reorder');
        const reorderItems: CartItem[] = JSON.parse(raw);
        if (!Array.isArray(reorderItems) || reorderItems.length === 0) return false;

        const matchedItems: CartItem[] = [];
        for (const ri of reorderItems) {
          const menuItem = menuItems.find((m) => m.name === ri.name);
          if (menuItem) {
            matchedItems.push({
              cartId: crypto.randomUUID(),
              itemId: menuItem.id,
              name: menuItem.name,
              image_url: menuItem.image_url,
              precioUnitario: menuItem.base_price,
              quantity: ri.quantity,
              extras: [],
              removidos: [],
              notes: '',
            });
          }
        }
        if (matchedItems.length > 0) {
          setItems(matchedItems);
          return true;
        }
        return false;
      } catch {
        localStorage.removeItem('hoppiness_reorder');
        return false;
      }
    },
    [],
  );

  // Persist to localStorage on changes (debounced)
  useEffect(() => {
    const timeout = setTimeout(() => {
      const data: PersistedCart = { items, tipoServicio, timestamp: Date.now() };
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(data));
    }, 300);
    return () => clearTimeout(timeout);
  }, [items, tipoServicio]);

  const addItem = useCallback((item: Omit<CartItem, 'cartId'>) => {
    setItems((prev) => [...prev, { ...item, cartId: crypto.randomUUID() }]);
  }, []);

  const removeItem = useCallback((cartId: string) => {
    setItems((prev) => prev.filter((i) => i.cartId !== cartId));
  }, []);

  const updateQuantity = useCallback((cartId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.cartId !== cartId));
      return;
    }
    setItems((prev) => prev.map((i) => (i.cartId === cartId ? { ...i, quantity } : i)));
  }, []);

  /** Quick add: if item has no extras/removidos, merge quantities */
  const quickAdd = useCallback(
    (
      itemId: string,
      itemName: string,
      precio: number,
      imageUrl: string | null,
      meta?: {
        sourceItemId?: string;
        isPromoArticle?: boolean;
        promocionId?: string | null;
        promocionItemId?: string | null;
        includedModifiers?: Array<{ name: string; quantity: number }>;
      },
    ) => {
      setItems((prev) => {
        const existing = prev.find(
          (i) =>
            i.itemId === itemId && i.extras.length === 0 && i.removidos.length === 0 && !i.notes,
        );
        if (existing) {
          return prev.map((i) =>
            i.cartId === existing.cartId ? { ...i, quantity: i.quantity + 1 } : i,
          );
        }
        return [
          ...prev,
          {
            cartId: crypto.randomUUID(),
            itemId,
            sourceItemId: meta?.sourceItemId,
            isPromoArticle: meta?.isPromoArticle,
            promocionId: meta?.promocionId ?? null,
            promocionItemId: meta?.promocionItemId ?? null,
            includedModifiers: meta?.includedModifiers,
            name: itemName,
            image_url: imageUrl,
            precioUnitario: precio,
            quantity: 1,
            extras: [],
            removidos: [],
            notes: '',
          },
        ];
      });
    },
    [],
  );

  const clearCart = useCallback(() => {
    setItems([]);
    localStorage.removeItem(CART_STORAGE_KEY);
  }, []);

  const totalItems = useMemo(() => items.reduce((s, i) => s + i.quantity, 0), [items]);

  const totalPrecio = useMemo(
    () =>
      items.reduce((s, i) => {
        const extrasTotal = i.extras.reduce((e, x) => e + x.precio * (x.quantity ?? 1), 0);
        return s + (i.precioUnitario + extrasTotal) * i.quantity;
      }, 0),
    [items],
  );

  /** Get quantity of an item in cart (all entries combined) */
  const getItemQty = useCallback(
    (itemId: string) =>
      items.filter((i) => i.itemId === itemId).reduce((s, i) => s + i.quantity, 0),
    [items],
  );

  return {
    items,
    tipoServicio,
    setTipoServicio,
    addItem,
    removeItem,
    updateQuantity,
    quickAdd,
    clearCart,
    totalItems,
    totalPrecio,
    getItemQty,
    loadReorderItems,
  };
}
