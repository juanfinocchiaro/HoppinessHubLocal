/**
 * WebappIncomingBanner — Banner flotante global de pedidos webapp pendientes.
 *
 * Se monta en BranchLayout y aparece en CUALQUIER página de Mi Local
 * cuando hay pedidos con origen='webapp' y estado='pendiente'.
 */
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWebappPendingCount } from '@/hooks/useWebappPendingCount';

interface WebappIncomingBannerProps {
  branchId: string;
  posEnabled?: boolean;
}

export function WebappIncomingBanner({ branchId, posEnabled }: WebappIncomingBannerProps) {
  const { count, isLoading } = useWebappPendingCount({ branchId, enabled: !!posEnabled });
  const navigate = useNavigate();

  if (isLoading || count === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex items-center gap-3 rounded-full bg-destructive text-destructive-foreground px-5 py-2.5 shadow-lg">
        <Bell className="w-5 h-5 animate-pulse" />
        <span className="text-sm font-medium">
          {count} pedido{count !== 1 ? 's' : ''} WebApp pendiente{count !== 1 ? 's' : ''}
        </span>
        <Button
          size="sm"
          variant="secondary"
          className="rounded-full h-7 px-3 text-xs"
          onClick={() => navigate(`/milocal/${branchId}/ventas/pos`)}
        >
          Ver pedidos
        </Button>
      </div>
    </div>
  );
}
