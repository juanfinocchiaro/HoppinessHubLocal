/**
 * POSPortalContext - Provides a container ref so POS dialogs
 * render inside the POS area instead of document.body.
 */
import { createContext, useContext, useRef, type ReactNode, type RefObject } from 'react';

const POSPortalContext = createContext<RefObject<HTMLDivElement | null> | null>(null);

export function POSPortalProvider({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  return (
    <POSPortalContext.Provider value={ref}>
      <div ref={ref} className="relative h-full w-full overflow-hidden">
        {children}
      </div>
    </POSPortalContext.Provider>
  );
}

export function usePOSPortal() {
  return useContext(POSPortalContext);
}
