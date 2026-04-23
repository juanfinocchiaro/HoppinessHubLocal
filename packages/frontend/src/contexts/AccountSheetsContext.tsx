import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { MisPedidosSheet } from '@/components/webapp/MisPedidosSheet';
import { DireccionesSheet } from '@/components/webapp/DireccionesSheet';
import { PerfilSheet } from '@/components/webapp/PerfilSheet';

interface AccountSheetsContextType {
  openMisPedidos: () => void;
  openDirecciones: () => void;
  openPerfil: () => void;
}

const AccountSheetsContext = createContext<AccountSheetsContextType | null>(null);

export function useAccountSheets() {
  const ctx = useContext(AccountSheetsContext);
  if (!ctx) throw new Error('useAccountSheets must be used within AccountSheetsProvider');
  return ctx;
}

export function AccountSheetsProvider({ children }: { children: ReactNode }) {
  const [misPedidosOpen, setMisPedidosOpen] = useState(false);
  const [direccionesOpen, setDireccionesOpen] = useState(false);
  const [perfilOpen, setPerfilOpen] = useState(false);
  const navigate = useNavigate();

  const openMisPedidos = useCallback(() => setMisPedidosOpen(true), []);
  const openDirecciones = useCallback(() => setDireccionesOpen(true), []);
  const openPerfil = useCallback(() => setPerfilOpen(true), []);

  const handleShowTracking = useCallback(
    (trackingCode: string) => {
      navigate(`/pedido/${trackingCode}`);
    },
    [navigate],
  );

  return (
    <AccountSheetsContext.Provider value={{ openMisPedidos, openDirecciones, openPerfil }}>
      {children}
      <MisPedidosSheet
        open={misPedidosOpen}
        onOpenChange={setMisPedidosOpen}
        onShowTracking={handleShowTracking}
      />
      <DireccionesSheet open={direccionesOpen} onOpenChange={setDireccionesOpen} />
      <PerfilSheet open={perfilOpen} onOpenChange={setPerfilOpen} />
    </AccountSheetsContext.Provider>
  );
}
