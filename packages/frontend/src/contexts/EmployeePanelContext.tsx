import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

type PanelSection = 'hoy' | 'mes' | 'horarios' | 'liquidacion';

interface EmployeePanelState {
  open: boolean;
  userId: string;
  userName: string;
  initialSection: PanelSection;
}

interface EmployeePanelContextValue {
  state: EmployeePanelState;
  openPanel: (userId: string, userName: string, section?: PanelSection) => void;
  closePanel: () => void;
}

const DEFAULT: EmployeePanelState = {
  open: false,
  userId: '',
  userName: '',
  initialSection: 'hoy',
};

const Ctx = createContext<EmployeePanelContextValue | null>(null);

export function EmployeePanelProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<EmployeePanelState>(DEFAULT);

  const openPanel = useCallback((userId: string, userName: string, section: PanelSection = 'hoy') => {
    setState({ open: true, userId, userName, initialSection: section });
  }, []);

  const closePanel = useCallback(() => {
    setState(DEFAULT);
  }, []);

  return (
    <Ctx.Provider value={{ state, openPanel, closePanel }}>
      {children}
    </Ctx.Provider>
  );
}

export function useEmployeePanel() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useEmployeePanel must be used within EmployeePanelProvider');
  return ctx;
}
