/**
 * usePOSSessionState - Persists POS cart/payments/config in sessionStorage
 * so state survives sidebar navigation within the same tab.
 * Keyed by branchId so different branches have independent carts.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import type { CartItem, LocalPayment, OrderConfig } from '@/types/pos';
import { DEFAULT_ORDER_CONFIG } from '@/types/pos';

interface POSSessionData {
  cart: CartItem[];
  payments: LocalPayment[];
  configConfirmed: boolean;
  orderConfig: OrderConfig;
}

const STORAGE_KEY_PREFIX = 'pos_session_';

function getStorageKey(branchId: string) {
  return `${STORAGE_KEY_PREFIX}${branchId}`;
}

function loadSession(branchId: string | undefined): POSSessionData | null {
  if (!branchId) return null;
  try {
    const raw = sessionStorage.getItem(getStorageKey(branchId));
    if (!raw) return null;
    return JSON.parse(raw) as POSSessionData;
  } catch {
    return null;
  }
}

function saveSession(branchId: string | undefined, data: POSSessionData) {
  if (!branchId) return;
  // Only persist if there's actual data worth saving
  if (data.cart.length === 0 && data.payments.length === 0 && !data.configConfirmed) {
    sessionStorage.removeItem(getStorageKey(branchId));
    return;
  }
  try {
    sessionStorage.setItem(getStorageKey(branchId), JSON.stringify(data));
  } catch {
    // Storage full or unavailable – silently ignore
  }
}

export function usePOSSessionState(branchId: string | undefined) {
  const initialised = useRef(false);

  // Lazy initial state from sessionStorage
  const [cart, setCart] = useState<CartItem[]>(() => {
    return loadSession(branchId)?.cart ?? [];
  });
  const [payments, setPayments] = useState<LocalPayment[]>(() => {
    return loadSession(branchId)?.payments ?? [];
  });
  const [configConfirmed, setConfigConfirmed] = useState(() => {
    return loadSession(branchId)?.configConfirmed ?? false;
  });
  const [orderConfig, setOrderConfig] = useState<OrderConfig>(() => {
    return loadSession(branchId)?.orderConfig ?? DEFAULT_ORDER_CONFIG;
  });

  // Persist on every change (debounce not needed – writes are tiny)
  useEffect(() => {
    // Skip the very first render to avoid double-saving loaded state
    if (!initialised.current) {
      initialised.current = true;
      return;
    }
    saveSession(branchId, { cart, payments, configConfirmed, orderConfig });
  }, [branchId, cart, payments, configConfirmed, orderConfig]);

  const resetAll = useCallback(() => {
    setCart([]);
    setPayments([]);
    setOrderConfig(DEFAULT_ORDER_CONFIG);
    setConfigConfirmed(false);
    if (branchId) sessionStorage.removeItem(getStorageKey(branchId));
  }, [branchId]);

  return {
    cart,
    setCart,
    payments,
    setPayments,
    configConfirmed,
    setConfigConfirmed,
    orderConfig,
    setOrderConfig,
    resetAll,
  };
}
